from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional, Dict, Any
import re
from datetime import datetime
from app.models.lead import Lead
from app.models.user import User
from app.api import deps
from app.utils.cache import cache
from app.utils.data_masking import mask_lead_data, should_mask_data
from beanie.operators import RegEx, Or, GTE, LTE

router = APIRouter()

@router.get("/")

async def list_leads(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None,
    vendor_id: Optional[str] = None,
    source_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Returns a paginated list of leads with global filters.
    """
    from beanie.operators import ElemMatch
    
    query: List[Any] = [Lead.tenant_id == current_user.tenant_id]
    
    if vendor_id:
        query.append(Lead.vendor_id == vendor_id)
    if source_id:
        query.append(Lead.source_id == source_id)
    if customer_id:
        query.append(ElemMatch(Lead.routing_results, {"customer_id": customer_id}))
    if campaign_id:
        query.append(ElemMatch(Lead.routing_results, {"campaign_id": campaign_id}))
    if status:
        query.append(Lead.status == status)
        
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query.append(GTE(Lead.created_at, start_dt))
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query.append(LTE(Lead.created_at, end_dt))
        except ValueError:
            pass
            
    if search:
        escaped_search = re.escape(search)
        search_conditions = [
            RegEx(Lead.status, escaped_search, "i"),
            RegEx("lead_id", escaped_search, "i"),
            RegEx("data.email", escaped_search, "i"),
            RegEx("data.phone", escaped_search, "i"),
            RegEx("data.first_name", escaped_search, "i"),
            RegEx("data.last_name", escaped_search, "i"),
            RegEx("external_id", escaped_search, "i"),
        ]
        
        # Support searching by Lead ID format (LD-XXXXXX or just the hex part)
        # Remove "LD-" prefix if present and search for ObjectIDs containing the hex string
        lead_id_search = search.upper().replace("LD-", "").replace("-", "")
        if lead_id_search and re.match(r'^[A-F0-9]+$', lead_id_search):
            # Search for ObjectIDs that contain this hex string (case-insensitive)
            search_conditions.append(RegEx("_id", lead_id_search, "i"))
        
        query.append(Or(*search_conditions))
        
    # Execute query
    total_count = await Lead.find(*query).count()
    leads = await Lead.find(*query).sort(-Lead.created_at).skip(skip).limit(limit).to_list()
    
    # Apply data masking for non-admin users
    should_mask = should_mask_data(current_user.role, current_user.permissions)
    
    if should_mask:
        # Mask sensitive data in leads
        masked_leads = []
        for lead in leads:
            lead_dict = lead.dict()
            if lead_dict.get('data'):
                lead_dict['data'] = mask_lead_data(lead_dict['data'])
            masked_leads.append(lead_dict)
        items = masked_leads
    else:
        items = leads
    
    return {
        "items": items,
        "total": total_count,
        "page": (skip // limit) + 1,
        "pages": (total_count + limit - 1) // limit if total_count > 0 else 0
    }

@router.get("/export")
async def export_leads(
    search: Optional[str] = None,
    vendor_id: Optional[str] = None,
    source_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Exports filtered leads as a CSV file.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from beanie.operators import ElemMatch
    
    query: List[Any] = [Lead.tenant_id == current_user.tenant_id]
    
    if vendor_id:
        query.append(Lead.vendor_id == vendor_id)
    if source_id:
        query.append(Lead.source_id == source_id)
    if customer_id:
        query.append(ElemMatch(Lead.routing_results, {"customer_id": customer_id}))
    if campaign_id:
        query.append(ElemMatch(Lead.routing_results, {"campaign_id": campaign_id}))
    if status:
        query.append(Lead.status == status)
        
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query.append(GTE(Lead.created_at, start_dt))
        except ValueError: pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query.append(LTE(Lead.created_at, end_dt))
        except ValueError: pass
            
    if search:
        # Use text index if available, or fall back to regex
        # For now keeping regex as text index might not cover all fields exactly as regex does (partial matches)
        # But we added text index for future optimization.
        escaped_search = re.escape(search)
        query.append(Or(
            RegEx(Lead.status, escaped_search, "i"),
            RegEx("data.email", escaped_search, "i"),
            RegEx("data.phone", escaped_search, "i"),
            RegEx("data.first_name", escaped_search, "i"),
            RegEx("data.last_name", escaped_search, "i"),
            RegEx("external_id", escaped_search, "i"),
        ))

    # 1. Efficiently discover all data keys using Aggregation
    # This prevents loading full objects just to finding keys
    pipeline = [
        {"$project": {"data": {"$objectToArray": "$data"}}},
        {"$unwind": "$data"},
        {"$group": {"_id": None, "keys": {"$addToSet": "$data.k"}}}
    ]
    
    # We need to apply the filter to the aggregation
    # Beanie find(...).aggregate(pipeline) applies the filter first
    keys_result = await Lead.find(*query).aggregate(pipeline).to_list(1)
    
    sorted_data_keys = []
    if keys_result:
        sorted_data_keys = sorted(keys_result[0].get("keys", []))

    # Check if data should be masked
    should_mask = should_mask_data(current_user.role, current_user.permissions)
    
    async def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)

        # Write Header
        header = ["Lead ID", "External ID", "Created At", "Status", "Vendor ID", "Source ID"] + sorted_data_keys
        writer.writerow(header)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # Stream Rows
        async for lead in Lead.find(*query).sort(-Lead.created_at):
            # Apply masking if needed
            lead_data = lead.data
            if should_mask:
                lead_data = mask_lead_data(lead.data)
            
            row = [
                str(lead.id),
                lead.external_id or "",
                lead.created_at.isoformat(),
                lead.status,
                lead.vendor_id,
                lead.source_id
            ]
            for key in sorted_data_keys:
                row.append(lead_data.get(key, ""))
            
            writer.writerow(row)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
