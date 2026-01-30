from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel
from datetime import datetime, timedelta
import re
from app.models.vendor import Vendor, Source, generate_readable_id
from app.models.user import User
from app.models.analytics import AnalyticsEvent
from app.services.unknown_field_service import UnknownFieldService
from app.api import deps
from app.core.permissions import Permission

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from beanie import PydanticObjectId

router = APIRouter()

class VendorCreate(BaseModel):
    name: str

class VendorResponse(BaseModel):
    id: str
    readable_id: Optional[str] = None
    name: str
    status: str
    sources: List[Source]

class VendorStatsResponse(BaseModel):
    id: str
    readable_id: Optional[str] = None
    name: str
    status: str
    leads: int
    duplicates: int
    leads_today: int
    duplicates_today: int
    leads_yesterday: int
    last_7_days: int
    last_30_days: int
    last_90_days: int
    last_180_days: int
    last_365_days: int
    all_time: int

class PaginatedVendorStatsResponse(BaseModel):
    items: List[VendorStatsResponse]
    total: int
    page: int
    pages: int

class SourceCreate(BaseModel):
    name: str
    type: str = "api"
    config: Optional[dict] = None
    validation: Optional[dict] = None
    mapping: Optional[dict] = None
    rules: Optional[dict] = None

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    api_key: Optional[str] = None
    config: Optional[dict] = None
    validation: Optional[dict] = None
    mapping: Optional[dict] = None
    rules: Optional[dict] = None

class VendorSourceStatsResponse(BaseModel):
    source_id: str
    readable_id: Optional[str] = None
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

class PaginatedVendorSourceStatsResponse(BaseModel):
    items: List[VendorSourceStatsResponse]
    total: int
    page: int
    pages: int

async def find_vendor(vendor_id: str, tenant_id: str) -> Vendor:
    """Helper to find a vendor by ObjectId or readable_id within a tenant's scope."""
    from beanie import PydanticObjectId
    
    # Try ObjectId first
    try:
        oid = PydanticObjectId(vendor_id)
        vendor = await Vendor.find_one(Vendor.id == oid, Vendor.tenant_id == tenant_id)
        if vendor:
            return vendor
    except:
        pass
        
    # Fallback to readable_id
    vendor = await Vendor.find_one(Vendor.readable_id == vendor_id, Vendor.tenant_id == tenant_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.post("/", response_model=VendorResponse)
async def create_vendor(
    vendor_in: VendorCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_VENDORS))
):
    from app.models.vendor import generate_readable_id
    vendor = Vendor(
        name=vendor_in.name, 
        readable_id=generate_readable_id("VND"),
        owner_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    await vendor.create()

    return VendorResponse(id=str(vendor.id), readable_id=vendor.readable_id, name=vendor.name, status=vendor.status, sources=vendor.sources)

@router.get("/", response_model=List[VendorResponse])

async def list_vendors(
    request: Request,
    response: Response,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_VENDORS))
):

    vendors = await Vendor.find(Vendor.tenant_id == current_user.tenant_id).to_list()
    return [VendorResponse(id=str(v.id), readable_id=v.readable_id, name=v.name, status=v.status, sources=v.sources) for v in vendors]

@router.get("/stats", response_model=PaginatedVendorStatsResponse)

async def list_vendor_stats(
    request: Request,
    response: Response,
    limit: int = 100,
    skip: int = 0,
    search: Optional[str] = None,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_VENDORS))
):

    """
    Returns vendor metrics for the Vendors table with pagination and search.
    Now computed from the Lead collection, optimized for performance.
    """
    # 1. Fetch all vendors for this tenant and apply search filter
    all_vendors = await Vendor.find(Vendor.tenant_id == current_user.tenant_id).to_list()
    
    filtered_vendors = all_vendors
    if search:
        q = search.lower()
        filtered_vendors = [
            v for v in all_vendors 
            if q in v.name.lower() or q in str(v.id).lower() or (v.readable_id and q in v.readable_id.lower())
        ]
    
    total_filtered = len(filtered_vendors)
    
    # 2. Slice for pagination
    # Default sorting or logic could be added here if needed
    paginated_vendors = filtered_vendors[skip : skip + limit]
    
    vendor_ids = [str(v.id) for v in paginated_vendors]
    
    if not vendor_ids:
        return PaginatedVendorStatsResponse(
            items=[],
            total=total_filtered,
            page=(skip // limit) + 1,
            pages=(total_filtered + limit - 1) // limit if total_filtered > 0 else 0
        )

    # 3. Lead stats aggregation (only for the paginated slice)
    now = datetime.now()
    start_today = datetime(now.year, now.month, now.day)
    start_yesterday = start_today - timedelta(days=1)
    
    pipeline = [
        {
            "$match": {
                "vendor_id": {"$in": vendor_ids},
                "tenant_id": current_user.tenant_id
            }
        },
        {
            "$group": {
                "_id": "$vendor_id",
                "total_leads": {
                    "$sum": {"$cond": [{"$eq": ["$status", "processed"]}, 1, 0]}
                },
                "total_duplicates": {
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
                },
                "leads_today": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "processed"]},
                                {"$gte": ["$created_at", start_today]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "duplicates_today": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "rejected"]},
                                {"$regexMatch": {"input": "$rejection_reason", "regex": "Duplicate"}},
                                {"$gte": ["$created_at", start_today]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "leads_yesterday": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "processed"]},
                                {"$gte": ["$created_at", start_yesterday]},
                                {"$lt": ["$created_at", start_today]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "last_7_days": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=7)]}]}, 1, 0]}},
                "last_30_days": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=30)]}]}, 1, 0]}},
                "last_90_days": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=90)]}]}, 1, 0]}},
                "last_180_days": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=180)]}]}, 1, 0]}},
                "last_365_days": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=365)]}]}, 1, 0]}},
            }
        }
    ]

    from app.models.lead import Lead
    stats_rows = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(None)
    stats_by_vendor_id = {row["_id"]: row for row in stats_rows}

    # 4. Build response items
    items: List[VendorStatsResponse] = []
    for v in paginated_vendors:
        vid = str(v.id)
        row = stats_by_vendor_id.get(vid, {})

        items.append(
            VendorStatsResponse(
                id=vid,
                readable_id=v.readable_id,
                name=v.name,
                status=v.status,
                leads=row.get("total_leads", 0),
                duplicates=row.get("total_duplicates", 0),
                leads_today=row.get("leads_today", 0),
                duplicates_today=row.get("duplicates_today", 0),
                leads_yesterday=row.get("leads_yesterday", 0),
                last_7_days=row.get("last_7_days", 0),
                last_30_days=row.get("last_30_days", 0),
                last_90_days=row.get("last_90_days", 0),
                last_180_days=row.get("last_180_days", 0),
                last_365_days=row.get("last_365_days", 0),
                all_time=row.get("total_leads", 0),
            )
        )

    # Note: Sorting by leads or alphabetical can be done on the filtered list or items
    # Here we keep the insertion order from all_vendors (usually created_at descending if configured)
    
    return PaginatedVendorStatsResponse(
        items=items,
        total=total_filtered,
        page=(skip // limit) + 1,
        pages=(total_filtered + limit - 1) // limit if total_filtered > 0 else 0
    )

@router.get("/{vendor_id}", response_model=VendorResponse)

async def get_vendor(
    request: Request,
    response: Response,
    vendor_id: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_VENDORS))
):

    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    return VendorResponse(id=str(vendor.id), readable_id=vendor.readable_id, name=vendor.name, status=vendor.status, sources=vendor.sources)

@router.get("/{vendor_id}/sources/stats", response_model=PaginatedVendorSourceStatsResponse)

async def list_vendor_source_stats(
    request: Request,
    response: Response,
    vendor_id: str,
    limit: int = 50,
    skip: int = 0,
    search: Optional[str] = None,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_SOURCES))
):
    # Cache for 10 seconds in browser

    """
    Source table for a particular vendor with pagination and search.
    Computed from the Lead collection, optimized for performance.
    """
    vendor = await find_vendor(vendor_id, current_user.tenant_id)

    # 1. Filter sources based on search query
    filtered_sources = vendor.sources
    if search:
        q = search.lower()
        filtered_sources = [
            s for s in vendor.sources 
            if q in s.name.lower() or q in s.id.lower() or (s.readable_id and q in s.readable_id.lower())
        ]

    # 2. Sort sources (newest first)
    filtered_sources.sort(key=lambda s: s.created_at if s.created_at else datetime.min, reverse=True)
    
    total_filtered = len(filtered_sources)
    
    # 3. Slice for pagination
    paginated_sources = filtered_sources[skip : skip + limit]
    
    source_ids = [s.id for s in paginated_sources]
    
    if not source_ids:
        return PaginatedVendorSourceStatsResponse(
            items=[],
            total=total_filtered,
            page=(skip // limit) + 1,
            pages=(total_filtered + limit - 1) // limit if total_filtered > 0 else 0
        )

    # 4. Aggregation pipeline for lead stats (only for the paginated slice)
    now = datetime.now()
    start_today = datetime(now.year, now.month, now.day)
    start_yesterday = start_today - timedelta(days=1)

    pipeline = [
        {
            "$match": {
                "source_id": {"$in": source_ids},
                "tenant_id": current_user.tenant_id
            }
        },
        {
            "$group": {
                "_id": "$source_id",
                "total_leads": {
                    "$sum": {"$cond": [{"$eq": ["$status", "processed"]}, 1, 0]}
                },
                "total_duplicates": {
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
                },
                "leads_today": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "processed"]},
                                {"$gte": ["$created_at", start_today]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "duplicates_today": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "rejected"]},
                                {"$regexMatch": {"input": "$rejection_reason", "regex": "Duplicate"}},
                                {"$gte": ["$created_at", start_today]}
                            ]}, 
                            1, 
                            0
                        ]
                    }
                },
                "leads_yesterday": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$status", "processed"]},
                                {"$gte": ["$created_at", start_yesterday]},
                                {"$lt": ["$created_at", start_today]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "last_week": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=7)]}]}, 1, 0]}},
                "last_month": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=30)]}]}, 1, 0]}},
                "last_year": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "processed"]}, {"$gte": ["$created_at", now - timedelta(days=365)]}]}, 1, 0]}},
            }
        }
    ]

    from app.models.lead import Lead
    stats_rows = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(None)
    stats_by_source_id = {row["_id"]: row for row in stats_rows}

    # 5. Build response items
    items: List[VendorSourceStatsResponse] = []
    for source in paginated_sources:
        row = stats_by_source_id.get(source.id, {})
        
        dupe_check_status = "Enabled" if getattr(source.config, "dupe_check", False) else "Disabled"
        create_date = source.created_at.strftime("%Y-%m-%d") if source.created_at else ""
        source_group = getattr(source.config, "vendor_group", None)

        items.append(
            VendorSourceStatsResponse(
                source_id=source.id,
                readable_id=source.readable_id,
                source_name=source.name,
                create_date=create_date,
                auth_key=source.api_key,
                source_group=source_group,
                dupe_check=dupe_check_status,
                leads=row.get("total_leads", 0),
                duplicates=row.get("total_duplicates", 0),
                duplicates_today=row.get("duplicates_today", 0),
                today=row.get("leads_today", 0),
                yesterday=row.get("leads_yesterday", 0),
                last_week=row.get("last_week", 0),
                last_month=row.get("last_month", 0),
                last_year=row.get("last_year", 0),
                all_time=row.get("total_leads", 0),
                status=source.config.status,
            )
        )

    return PaginatedVendorSourceStatsResponse(
        items=items,
        total=total_filtered,
        page=(skip // limit) + 1,
        pages=(total_filtered + limit - 1) // limit if total_filtered > 0 else 0
    )

@router.post("/{vendor_id}/sources", response_model=Source)
async def create_source(
    vendor_id: str, 
    payload: SourceCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_SOURCES))
):
    from app.models.vendor import generate_readable_id
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    
    new_source = Source(name=payload.name, type=payload.type, readable_id=generate_readable_id("SRC"))
    if payload.config is not None:
        new_source.config = new_source.config.model_validate(payload.config)
    if payload.validation is not None:
        new_source.validation = new_source.validation.model_validate(payload.validation)
    if payload.mapping is not None:
        new_source.mapping = new_source.mapping.model_validate(payload.mapping)
    if payload.rules is not None:
        new_source.rules = new_source.rules.model_validate(payload.rules)

    vendor.sources.append(new_source)
    await vendor.save()
    
    # Comprehensive cache invalidation - ensure new source appears immediately

    # Sync Mappings
    if payload.mapping and payload.mapping.get("rules"):
        await UnknownFieldService.sync_source_mappings(new_source.id, payload.mapping["rules"], str(current_user.id))

    return new_source

@router.get("/{vendor_id}/sources/{source_id}", response_model=Source)

async def get_source(
    request: Request,
    response: Response,
    vendor_id: str, 
    source_id: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_SOURCES))
):

    
    # Direct lookup for speed and efficiency
    from beanie import PydanticObjectId
    try:
        vid_oid = PydanticObjectId(vendor_id)
        # Use aggregation to find the vendor and extract ONLY the matching source
        # This is MUCH faster than loading a vendor with potentially hundreds of sources
        pipeline = [
            {"$match": {"_id": vid_oid, "tenant_id": current_user.tenant_id}},
            {"$project": {
                "sources": {
                    "$filter": {
                        "input": "$sources",
                        "as": "s",
                        "cond": {"$eq": ["$$s.id", source_id]}
                    }
                }
            }}
        ]
        results = await Vendor.get_pymongo_collection().aggregate(pipeline).to_list(1)
        if results and results[0].get("sources") and len(results[0]["sources"]) > 0:
            return results[0]["sources"][0]
    except:
        pass

    # Fallback to readable_id search if not found by OID
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    source = next((s for s in vendor.sources if s.id == source_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    return source

@router.put("/{vendor_id}/sources/{source_id}", response_model=Source)
async def update_source(
    vendor_id: str, 
    source_id: str, 
    payload: SourceUpdate,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_SOURCES))
):
    vendor = await find_vendor(vendor_id, current_user.tenant_id)

    idx = next((i for i, s in enumerate(vendor.sources) if s.id == source_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Source not found")

    source = vendor.sources[idx]
    if payload.name is not None:
        source.name = payload.name
    if payload.type is not None:
        source.type = payload.type
    if payload.api_key is not None:
        source.api_key = payload.api_key
    if payload.config is not None:
        source.config = source.config.model_validate(payload.config)
    if payload.validation is not None:
        source.validation = source.validation.model_validate(payload.validation)
    if payload.mapping is not None:
        source.mapping = source.mapping.model_validate(payload.mapping)
    if payload.rules is not None:
        source.rules = source.rules.model_validate(payload.rules)

    vendor.sources[idx] = source
    await vendor.save()

    # Comprehensive cache invalidation - ensure updates appear immediately

    # Sync Mappings
    if payload.mapping and payload.mapping.get("rules"):
        await UnknownFieldService.sync_source_mappings(source_id, payload.mapping["rules"], str(current_user.id))

    return source

@router.put("/{vendor_id}/status", response_model=VendorResponse)
async def update_vendor_status(
    vendor_id: str, 
    status: str,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_VENDORS))
):
    if status not in ["enabled", "disabled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    
    vendor.status = status
    
    # Logic: if vendor is disabled, disable all its sources
    if status == "disabled":
        for source in vendor.sources:
            source.config.status = "disabled"
            
    elif status == "enabled":
        for source in vendor.sources:
            source.config.status = "enabled"
            
    await vendor.save()
    # Invalidate Vendor cache
    return VendorResponse(id=str(vendor.id), readable_id=vendor.readable_id, name=vendor.name, status=vendor.status, sources=vendor.sources)

@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_VENDORS))
):
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    await vendor.delete()
    # Invalidate Vendor cache
    return {"message": "Vendor deleted successfully"}

@router.delete("/{vendor_id}/sources/{source_id}")
async def delete_source(
    vendor_id: str, 
    source_id: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_SOURCES))
):
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    
    idx = next((i for i, s in enumerate(vendor.sources) if s.id == source_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Source not found")
    
    vendor.sources.pop(idx)
    await vendor.save()
    
    # Comprehensive cache invalidation - ensure deletion appears immediately
    return {"message": "Source deleted successfully"}

@router.get("/{vendor_id}/leads")
async def get_vendor_leads(
    vendor_id: str, 
    limit: int = 50, 
    skip: int = 0,
    search: Optional[str] = None,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_LEADS))
):
    # Verify vendor ownership
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    vendor_oid = str(vendor.id)

    from app.models.lead import Lead
    from beanie.operators import RegEx, Or
    
    query = [Lead.vendor_id == vendor_oid, Lead.tenant_id == current_user.tenant_id]
    
    if search:
        escaped_search = re.escape(search)
        query.append(Or(
            RegEx(Lead.status, escaped_search, "i"),
            RegEx("data.email", escaped_search, "i"),
            RegEx("data.phone", escaped_search, "i"),
            RegEx("data.first_name", escaped_search, "i"),
            RegEx("data.last_name", escaped_search, "i"),
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

@router.get("/{vendor_id}/history")
async def get_vendor_stats_history(
    vendor_id: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_VENDORS))
):
    """
    Returns daily stats (leads, duplicates) for a vendor within a date range.
    """
    # Verify vendor ownership
    vendor = await find_vendor(vendor_id, current_user.tenant_id)
    vendor_oid = str(vendor.id)

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) # Include end date fully
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    pipeline = [
        {
            "$match": {
                "vendor_id": vendor_oid,
                "tenant_id": current_user.tenant_id,
                "created_at": {"$gte": start, "$lt": end}
            }
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
    
    # Fill in missing dates with 0
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
