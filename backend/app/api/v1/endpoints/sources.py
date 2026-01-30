from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
import re
from app.models.vendor import Vendor, Source
from app.models.analytics import AnalyticsEvent
from app.api import deps
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()

class SourceStatsResponse(BaseModel):
    source_id: str
    vendor_id: str
    vendor_name: str
    source_name: str
    create_date: str
    auth_key: str
    source_group: Optional[str] = None
    dupe_check: str
    leads: int
    duplicates: int
    duplicates_today: int
    today: int
    yesterday: int
    last_week: int
    last_month: int
    last_year: int
    all_time: int
    status: str

@router.get("/stats", response_model=List[SourceStatsResponse])
async def list_source_stats(current_user: User = Depends(deps.get_current_user)):
    """
    Returns all sources across all vendors with their metrics for the Sources table.
    """
    now = datetime.utcnow()
    today = datetime(now.year, now.month, now.day)
    start_today = today
    start_yesterday = start_today - timedelta(days=1)
    start_7 = start_today - timedelta(days=7)
    start_30 = start_today - timedelta(days=30)
    start_365 = start_today - timedelta(days=365)

    tenant_id = getattr(current_user, "tenant_id", None)
    
    # Defaults for single user (fallback)
    match_stage = {
        "event_type": "ingest",
        "source_id": {"$ne": None},
        "owner_id": str(current_user.id),
        "timestamp": {"$gte": start_365},
    }
    
    # If tenant_id exists, we need to find all users in that tenant for Event matching
    # (Since Events don't have tenant_id)
    owner_ids_for_events = [str(current_user.id)]
    
    if tenant_id:
        # Find all users in this tenant
        tenant_users = await User.find(User.tenant_id == tenant_id).to_list()
        owner_ids_for_events = [str(u.id) for u in tenant_users]
        
        match_stage["owner_id"] = {"$in": owner_ids_for_events}

    # Aggregate stats by source_id
    pipeline = [
        {
            "$match": match_stage
        },
        {
            "$group": {
                "_id": "$source_id",
                "last_365_days": {"$sum": 1},
                "last_30_days": {
                    "$sum": {"$cond": [{"$gte": ["$timestamp", start_30]}, 1, 0]}
                },
                "last_7_days": {
                    "$sum": {"$cond": [{"$gte": ["$timestamp", start_7]}, 1, 0]}
                },
                "today": {
                    "$sum": {"$cond": [{"$gte": ["$timestamp", start_today]}, 1, 0]}
                },
                "yesterday": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$timestamp", start_yesterday]},
                                    {"$lt": ["$timestamp", start_today]},
                                ]
                            },
                            1,
                            0,
                        ]
                    }
                },
            }
        },
    ]

    stats_rows = await AnalyticsEvent.get_pymongo_collection().aggregate(pipeline).to_list(None)
    stats_by_source_id = {row["_id"]: row for row in stats_rows}

    # Get all vendors (Tenant Aware)
    if tenant_id:
        vendors = await Vendor.find(Vendor.tenant_id == tenant_id).to_list()
    else:
        vendors = await Vendor.find(Vendor.owner_id == str(current_user.id)).to_list()
    response: List[SourceStatsResponse] = []

    for vendor in vendors:
        vendor_id = str(vendor.id)
        vendor_name = vendor.name

        for source in vendor.sources:
            source_id = source.id
            row = stats_by_source_id.get(source_id, {})

            today = int(row.get("today", 0) or 0)
            yesterday = int(row.get("yesterday", 0) or 0)
            last_week = int(row.get("last_7_days", 0) or 0)
            last_month = int(row.get("last_30_days", 0) or 0)
            last_year = int(row.get("last_365_days", 0) or 0)

            # all_time includes events older than 365d as well
            all_time = await AnalyticsEvent.find(
                AnalyticsEvent.event_type == "ingest",
                AnalyticsEvent.source_id == source_id,
                {"owner_id": {"$in": owner_ids_for_events}}
            ).count()

            # Determine dupe_check status from config
            dupe_check_status = "Enabled" if getattr(source.config, "dupe_check", False) else "Disabled"

            # Format create date
            create_date = source.created_at.strftime("%Y-%m-%d") if source.created_at else ""

            response.append(
                SourceStatsResponse(
                    source_id=source_id,
                    vendor_id=vendor_id,
                    vendor_name=vendor_name,
                    source_name=source.name,
                    create_date=create_date,
                    auth_key=source.api_key,
                    source_group=getattr(source.config, "vendor_group", None),
                    dupe_check=dupe_check_status,
                    leads=all_time,
                    duplicates=0,  # Not implemented yet
                    duplicates_today=0,  # Not implemented yet
                    today=today,
                    yesterday=yesterday,
                    last_week=last_week,
                    last_month=last_month,
                    last_year=last_year,
                    all_time=all_time,
                    status=getattr(source.config, "status", "enabled"),
                )
            )

    # Sort by source_id descending (newest first)
    response.sort(key=lambda r: r.source_id, reverse=True)
    return response

@router.get("/{source_id}/leads")
async def get_source_leads(
    source_id: str, 
    limit: int = 50, 
    skip: int = 0,
    search: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user)
):
    from app.models.lead import Lead
    from beanie.operators import RegEx, Or
    
    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id:
        query = [Lead.source_id == source_id, Lead.tenant_id == tenant_id]
    else:
        query = [Lead.source_id == source_id, Lead.owner_id == str(current_user.id)]
    
    if search:
        # Search in email, phone, first_name, last_name, or status
        # Since data is freeform, we'll try to match common fields inside data
        # Beanie supports nested field queries
        escaped_search = re.escape(search)
        query.append(Or(
            RegEx(Lead.status, escaped_search, "i"),
            RegEx("data.email", escaped_search, "i"),
            RegEx("data.phone", escaped_search, "i"),
            RegEx("data.first_name", escaped_search, "i"),
            RegEx("data.last_name", escaped_search, "i"),
            # Also try top-level data string match if possible? No, too inefficient.
            # Stick to these common fields for now.
        ))
    
    # Execute count and find
    total_count = await Lead.find(*query).count()
    leads = await Lead.find(*query).sort(-Lead.created_at).skip(skip).limit(limit).to_list()
    
    return {
        "items": leads,
        "total": total_count,
        "page": (skip // limit) + 1,
        "pages": (total_count + limit - 1) // limit
    }

@router.get("/{source_id}/history")
async def get_source_stats_history(
    source_id: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Returns daily stats (leads, duplicates) for a source within a date range.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    tenant_id = getattr(current_user, "tenant_id", None)
    match_query = {
        "source_id": source_id,
        "created_at": {"$gte": start, "$lt": end}
    }
    
    if tenant_id:
        match_query["tenant_id"] = tenant_id
    else:
        match_query["owner_id"] = str(current_user.id)
        
    pipeline = [
        {
            "$match": match_query
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "leads": {
                    "$sum": {"$cond": [{"$eq": ["$status", "processed"]}, 1, 0]}
                },
                "duplicates": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "rejected"]},
                                {"$regexMatch": {"input": "$rejection_reason", "regex": "Duplicate"}}
                            ]}, 
                            1, 
                            0
                        ]
                    }
                }
            }
        },
        {"$sort": {"_id": 1}}
    ]

    from app.models.lead import Lead
    rows = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(None)
    
    # Fill in missing dates
    result = []
    current = start
    data_map = {r["_id"]: r for r in rows}
    
    while current < end:
        day_str = current.strftime("%Y-%m-%d")
        row = data_map.get(day_str, {"leads": 0, "duplicates": 0})
        result.append({
            "date": day_str,
            "leads": row["leads"],
            "duplicates": row["duplicates"]
        })
        current += timedelta(days=1)
        
    return result
