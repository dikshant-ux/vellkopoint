from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel
from datetime import datetime
import logging
from app.services.customer_analytics import CustomerAnalyticsService
from app.tasks.email_tasks import send_raw_email_task
from app.models.vendor import generate_readable_id
from app.models.customer import Customer
from app.models.destination import Destination, DestinationConfig
from app.models.campaign import Campaign
from app.api import deps
from app.models.user import User
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from beanie import PydanticObjectId
import hashlib
from app.core.config import settings
from app.core.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()

async def find_customer(customer_id: str, tenant_id: str) -> Customer:
    """Helper to find a customer by ObjectId or readable_id within a tenant's scope."""
    # Try ObjectId first if it looks valid
    from bson import ObjectId
    if ObjectId.is_valid(customer_id):
        customer = await Customer.find_one(Customer.id == PydanticObjectId(customer_id), Customer.tenant_id == tenant_id)
        if customer:
            return customer
        
    # Fallback to readable_id
    customer = await Customer.find_one(Customer.readable_id == customer_id, Customer.tenant_id == tenant_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

async def _fetch_linked_docs(customer: Customer):
    """Helper to fetch linked documents for a customer."""
    from app.models.destination import Destination
    from app.models.campaign import Campaign
    
    dests = []
    if customer.destinations:
        # Convert all to ObjectId for query
        dest_oids = [PydanticObjectId(d_id) for d_id in customer.destinations if PydanticObjectId.is_valid(d_id)]
        if dest_oids:
            fetched = await Destination.find({"_id": {"$in": dest_oids}}).to_list()
            # Convert to list of dicts with string ID for response compatibility
            for d in fetched:
                d_dict = d.dict()
                d_dict['id'] = str(d.id)
                dests.append(d_dict)
                
    camps = []
    if customer.campaigns:
        camp_oids = [PydanticObjectId(c_id) for c_id in customer.campaigns if PydanticObjectId.is_valid(c_id)]
        if camp_oids:
            fetched = await Campaign.find({"_id": {"$in": camp_oids}}).to_list()
            for c in fetched:
                c_dict = c.dict()
                c_dict['id'] = str(c.id)
                camps.append(c_dict)
            
    return dests, camps

@router.get("/stats")
async def get_customer_stats(
    search: str = "",
    current_user: User = Depends(deps.require_permission(Permission.VIEW_CUSTOMERS))
):
    return await CustomerAnalyticsService.get_customer_stats_table(
        search=search, 
        tenant_id=current_user.tenant_id
    )

class CustomerCreate(BaseModel):
    name: str

class CampaignWithStats(Campaign):
    stats: Optional[Dict[str, Any]] = None

class CustomerResponse(BaseModel):
    id: str
    name: str
    status: str
    readable_id: Optional[str] = None
    destinations: List[Dict[str, Any]] = []
    campaigns: List[Dict[str, Any]] = []

class DestinationCreate(BaseModel):
    name: str
    type: str = "api"
    config: DestinationConfig

class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    config: Optional[DestinationConfig] = None

class CampaignCreate(BaseModel):
    name: str
    destination_id: str
    description: Optional[str] = None
    source_ids: List[str] = []
    config: Optional[dict] = None
    mapping: Optional[dict] = None
    rules: Optional[dict] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    destination_id: Optional[str] = None
    description: Optional[str] = None
    source_ids: Optional[List[str]] = None
    config: Optional[dict] = None
    mapping: Optional[dict] = None
    rules: Optional[dict] = None

# Rebuild models for Pydantic v2 forward refs/OpenAPI
DestinationCreate.model_rebuild()
DestinationUpdate.model_rebuild()
CampaignWithStats.model_rebuild()
CustomerResponse.model_rebuild()

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_in: CustomerCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_CUSTOMERS))
):
    from app.models.vendor import generate_readable_id
    customer = Customer(
        name=customer_in.name, 
        readable_id=generate_readable_id("CST"),
        owner_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    await customer.create()
    return CustomerResponse(
        id=str(customer.id), 
        name=customer.name, 
        status=customer.status,
        readable_id=customer.readable_id,
        destinations=customer.destinations,
        campaigns=customer.campaigns
    )

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(current_user: User = Depends(deps.require_permission(Permission.VIEW_CUSTOMERS))):
    customers = await Customer.find(Customer.tenant_id == current_user.tenant_id).to_list()
    
    response_list = []
    for customer in customers:
        dests, camps = await _fetch_linked_docs(customer)
        
        # We need stats for campaigns in list view? Model says CampaignWithStats
        # Assuming list view stats are optional or simplified
        camps_with_stats = []
        # Bulk fetch stats for this customer? 
        # For efficiency, we should probably allow list view to omit detailed stats or fetch lightly
        # But schema requires CampaignWithStats. 
        # Let's fetch stats.
        camp_stats = await CustomerAnalyticsService.get_campaign_stats_for_customer(str(customer.id), current_user.tenant_id)
        
        for camp in camps:
            # camp is a dict now
            camp["stats"] = camp_stats.get(camp["id"])
            camps_with_stats.append(camp)
            
        response_list.append(CustomerResponse(
            id=str(customer.id), 
            name=customer.name, 
            status=customer.status,
            readable_id=customer.readable_id,
            destinations=dests, 
            campaigns=camps_with_stats
        ))
    return response_list

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_CUSTOMERS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)

    destinations, campaigns = await _fetch_linked_docs(customer)

    # Fetch campaign stats
    camp_stats = await CustomerAnalyticsService.get_campaign_stats_for_customer(str(customer.id), current_user.tenant_id)
    
    # Attach stats to campaigns
    campaigns_with_stats = []
    for camp in campaigns:
        # camp is a dict now
        camp["stats"] = camp_stats.get(camp["id"])
        campaigns_with_stats.append(camp)

    print(f"DEBUG: Fetched {len(destinations)} destinations (clean IDs) for customer {customer_id}")

    return CustomerResponse(
        id=str(customer.id), 
        name=customer.name, 
        status=customer.status,
        readable_id=customer.readable_id,
        destinations=destinations,
        campaigns=campaigns_with_stats
    )


@router.put("/{customer_id}/status", response_model=CustomerResponse)
async def update_customer_status(
    customer_id: str, 
    status: str,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_CUSTOMERS))
):
    if status not in ["enabled", "disabled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    customer = await find_customer(customer_id, current_user.tenant_id)
    
    customer.status = status
    await customer.save()

    # Fetch campaign stats
    camp_stats = await CustomerAnalyticsService.get_campaign_stats_for_customer(str(customer.id), current_user.tenant_id)
    
    # Re-fetch linked docs to get dicts with IDs
    d_dicts, c_dicts = await _fetch_linked_docs(customer)
    
    # Attach stats to campaigns
    campaigns_with_stats = []
    for camp in c_dicts:
        camp["stats"] = camp_stats.get(camp["id"])
        campaigns_with_stats.append(camp)

    return CustomerResponse(
        id=str(customer.id), 
        name=customer.name, 
        status=customer.status,
        readable_id=customer.readable_id,
        destinations=d_dicts,
        campaigns=campaigns_with_stats
    )

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_CUSTOMERS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)
    await customer.delete()
    return {"message": "Customer deleted successfully"}

# --- Destinations ---

@router.post("/{customer_id}/destinations", response_model=Destination)
async def create_destination(
    customer_id: str, 
    payload: DestinationCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_DESTINATIONS))
):
    from app.core.roles import is_admin
    from app.services.email_service import send_email
    import logging
    
    logger = logging.getLogger(__name__)
    customer = await find_customer(customer_id, current_user.tenant_id)
    
    # Determine approval status based on user role
    # Admins can create pre-approved destinations, users need approval
    approval_status = "approved" if is_admin(current_user.role) else "pending"
    
    new_dest = Destination(
        name=payload.name,
        type=payload.type,
        config=payload.config,
        approval_status=approval_status,
        requested_by=str(current_user.id),
        owner_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    await new_dest.create()
    customer.destinations.append(str(new_dest.id))
    await customer.save()
    
    # If pending approval, send notification to Tenant Owner (admin/owner of the tenant)
    if approval_status == "pending":
        logger.info(f"Destination created pending approval: {new_dest.name} by {current_user.email}")
        # Send email to tenant owners/admins (in background)
        try:
            # Find all admin/owner users in this tenant and NOT me
            # Logic: users in this tenant with role IN [admin, owner] AND id != me
            # Or simplified: All users in tenant with role IN [admin, owner]
            admin_users = await User.find(
                {"tenant_id": current_user.tenant_id, "role": {"$in": ["admin", "owner", "super_admin"]}}
            ).to_list()
            
            for admin in admin_users:
                # Don't email myself if I'm somehow a restricted admin asking for approval (unlikely but good practice)
                if str(admin.id) == str(current_user.id):
                    continue
                    
                from app.services.email_service import send_destination_submitted_email
                await send_destination_submitted_email(
                    admin_email=admin.email,
                    admin_name=admin.full_name or admin.email,
                    requester_email=current_user.email,
                    destination_name=new_dest.name,
                    destination_type=new_dest.type,
                    destination_url=new_dest.config.url,
                    customer_name=customer.name,
                    approve_link=f"{settings.BACKEND_URL}{settings.API_V1_STR}/customers/destinations/{new_dest.id}/email-action?action=approve&token={hashlib.sha256(f'{new_dest.id}{settings.SECRET_KEY}'.encode()).hexdigest()}",
                    reject_link=f"{settings.BACKEND_URL}{settings.API_V1_STR}/customers/destinations/{new_dest.id}/email-action?action=reject&token={hashlib.sha256(f'{new_dest.id}{settings.SECRET_KEY}'.encode()).hexdigest()}"
                )
        except Exception as e:
            logger.error(f"Failed to send approval notification email: {e}")
    
    return new_dest

@router.delete("/{customer_id}/destinations/{destination_id}")
async def delete_destination(
    customer_id: str, 
    destination_id: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_DESTINATIONS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)
    
    idx = next((i for i, d_id in enumerate(customer.destinations) if d_id == destination_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    # Also delete the destination document? Or just unlink? Usually delete.
    # But wait, logic says "delete_destination", implies full deletion
    dest = await Destination.get(destination_id)
    if dest:
        await dest.delete()
        
    customer.destinations.pop(idx)
    await customer.save()
    return {"message": "Destination deleted successfully"}

@router.put("/{customer_id}/destinations/{destination_id}", response_model=Destination)
async def update_destination(
    customer_id: str, 
    destination_id: str, 
    payload: DestinationUpdate,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_DESTINATIONS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)
    
    # To update a destination, we must interact with the Destination collection directly
    # Using customer.destinations[idx] is just an ID string now.
    
    # Verify it's linked
    if destination_id not in customer.destinations:
        raise HTTPException(status_code=404, detail="Destination not found on this customer")
        
    dest = await Destination.find_one(Destination.id == PydanticObjectId(destination_id), Destination.tenant_id == current_user.tenant_id)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    if payload.name is not None:
        dest.name = payload.name
    if payload.type is not None:
        dest.type = payload.type
    if payload.config is not None:
        dest.config = payload.config
    
    await dest.save()
    # No need to save customer since ID didn't change
    return dest

# --- Campaigns ---

@router.post("/{customer_id}/campaigns", response_model=Campaign)
async def create_campaign(
    customer_id: str, 
    payload: CampaignCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_CAMPAIGNS))
):
    from app.models.vendor import generate_readable_id
    customer = await find_customer(customer_id, current_user.tenant_id)
    

    
    # Validation: Destination must be approved
    # Validation: Destination must be approved
    # Check if dest ID is in customer's list (it's strict now)
    if payload.destination_id not in customer.destinations:
         raise HTTPException(status_code=400, detail="Invalid destination ID (not linked to customer)")
         
    target_dest = await Destination.get(payload.destination_id)
    if not target_dest:
         raise HTTPException(status_code=400, detail="Destination not found")
         
    if target_dest.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Destination must be approved before linking to a campaign")

    new_campaign = Campaign(
        name=payload.name, 
        destination_id=payload.destination_id,
        description=payload.description,
        source_ids=payload.source_ids,
        readable_id=generate_readable_id("CMP"),
        owner_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    
    if payload.config:
        new_campaign.config = new_campaign.config.model_validate(payload.config)
    if payload.mapping:
        new_campaign.mapping = new_campaign.mapping.model_validate(payload.mapping)
    if payload.rules:
        new_campaign.rules = new_campaign.rules.model_validate(payload.rules)

    await new_campaign.create()
    customer.campaigns.append(str(new_campaign.id))
    await customer.save()
    return new_campaign

@router.get("/{customer_id}/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(
    customer_id: str, 
    campaign_id: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_CAMPAIGNS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)

    if campaign_id not in customer.campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found on this customer")
        
    campaign = await Campaign.find_one(Campaign.id == PydanticObjectId(campaign_id), Campaign.tenant_id == current_user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return campaign

@router.put("/{customer_id}/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(
    customer_id: str, 
    campaign_id: str, 
    payload: CampaignUpdate,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_CAMPAIGNS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)

    if campaign_id not in customer.campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found on this customer")

    campaign = await Campaign.find_one(Campaign.id == PydanticObjectId(campaign_id), Campaign.tenant_id == current_user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if payload.name is not None:
        campaign.name = payload.name
    if payload.destination_id is not None:
        # Validation: Destination must be approved
        if payload.destination_id not in customer.destinations:
             raise HTTPException(status_code=400, detail="Invalid destination ID")
             
        target_dest = await Destination.get(payload.destination_id)   
        if not target_dest or target_dest.approval_status != "approved":
            raise HTTPException(status_code=400, detail="Destination must be approved before linking to a campaign")
            
        campaign.destination_id = payload.destination_id
    if payload.description is not None:
        campaign.description = payload.description
    if payload.source_ids is not None:
        campaign.source_ids = payload.source_ids
    if payload.config is not None:
        campaign.config = campaign.config.model_validate(payload.config)
    if payload.mapping is not None:
        campaign.mapping = campaign.mapping.model_validate(payload.mapping)
    if payload.rules is not None:
        campaign.rules = campaign.rules.model_validate(payload.rules)

    await campaign.save()
    # No need to save customer
    return campaign

@router.delete("/{customer_id}/campaigns/{campaign_id}")
async def delete_campaign(
    customer_id: str, 
    campaign_id: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_CAMPAIGNS))
):
    customer = await find_customer(customer_id, current_user.tenant_id)
    
    idx = next((i for i, c_id in enumerate(customer.campaigns) if c_id == campaign_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    camp = await Campaign.get(campaign_id)
    if camp:
        await camp.delete()
        
    customer.campaigns.pop(idx)
    await customer.save()
    return {"message": "Campaign deleted successfully"}

@router.get("/{customer_id}/history")
async def get_customer_stats_history(
    customer_id: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Returns daily stats (delivered, failed) for a customer within a date range.
    Counts leads where routing_results contains this customer_id.
    """
    from datetime import datetime, timedelta
    
    # Verify customer ownership
    customer = await find_customer(customer_id, current_user.tenant_id)
    customer_oid = str(customer.id)

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) # Include end date fully
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    pipeline = [
        {
            "$match": {
                "tenant_id": current_user.tenant_id,
                "created_at": {"$gte": start, "$lt": end},
                "routing_results": {
                    "$elemMatch": {"customer_id": customer_oid}
                }
            }
        },
        {
            "$unwind": "$routing_results"
        },
        {
            "$match": {
                "routing_results.customer_id": customer_oid
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "leads": {"$sum": 1},
                "delivered": {
                    "$sum": {"$cond": [{"$eq": ["$routing_results.status", "delivered"]}, 1, 0]}
                },
                "failed": {
                    "$sum": {"$cond": [{"$eq": ["$routing_results.status", "failed"]}, 1, 0]}
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
        row = data_map.get(day_str, {"leads": 0, "delivered": 0, "failed": 0})
        result.append({
            "date": day_str,
            "leads": row["leads"],
            "delivered": row["delivered"],
            "failed": row["failed"]
        })
        current += timedelta(days=1)
        
    return result

@router.get("/{customer_id}/campaigns/{campaign_id}/history")
async def get_campaign_stats_history(
    customer_id: str,
    campaign_id: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_CAMPAIGNS))
):
    """
    Returns daily stats (delivered, failed) for a campaign within a date range.
    Counts leads where routing_results contains this campaign_id.
    """
    from datetime import datetime, timedelta
    
    # Verify customer and campaign ownership
    customer = await find_customer(customer_id, current_user.tenant_id)
    if campaign_id not in customer.campaigns:
         raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = await Campaign.find_one(Campaign.id == PydanticObjectId(campaign_id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) # Include end date fully
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    pipeline = [
        {
            "$match": {
                "tenant_id": current_user.tenant_id,
                "created_at": {"$gte": start, "$lt": end},
                "routing_results": {
                    "$elemMatch": {"campaign_id": campaign_id}
                }
            }
        },
        {
            "$unwind": "$routing_results"
        },
        {
            "$match": {
                "routing_results.campaign_id": campaign_id
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "leads": {"$sum": 1},
                "delivered": {
                    "$sum": {"$cond": [{"$eq": ["$routing_results.status", "delivered"]}, 1, 0]}
                },
                "failed": {
                    "$sum": {"$cond": [{"$eq": ["$routing_results.status", "failed"]}, 1, 0]}
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
        row = data_map.get(day_str, {"leads": 0, "delivered": 0, "failed": 0})
        result.append({
            "date": day_str,
            "leads": row["leads"],
            "delivered": row["delivered"],
            "failed": row["failed"]
        })
        current += timedelta(days=1)
        
    return result


# --- Destination Approval Workflow ---

class DestinationApprovalResponse(BaseModel):
    id: str
    name: str
    type: str
    url: str
    customer_id: str
    customer_name: str
    requested_by: str
    requested_by_email: Optional[str] = None
    created_at: Optional[str] = None


class ApproveDestination(BaseModel):
    pass  # No additional fields needed


class RejectDestination(BaseModel):
    reason: str


@router.get("/destinations/pending", response_model=List[DestinationApprovalResponse])
async def list_pending_destinations(
    current_user: User = Depends(deps.require_permission(Permission.APPROVE_DESTINATIONS))
):
    """
    List all pending destination approvals (Requires APPROVE_DESTINATIONS).
    """
    # Find all customers with pending destinations
    customers = await Customer.find(Customer.tenant_id == current_user.tenant_id).to_list()
    
    pending_destinations = []
    
    for customer in customers:
        # No recursive fetch, we have list of IDs
        # Need to fetch the actual destinations for this loop?
        # Re-using logic from find_cust/list_cust is inefficient here...
        # We need Pending destinations.
        # Actually better to query Destination directly: Dest.find(approval_status="pending", tenant_id=...)
        # But instructions verify we iterate customers.
        # Let's just use the direct query approach if allowed, simpler. 
        # But to stick to existing logic structure:
        dests, _ = await _fetch_linked_docs(customer)
        for dest_dict in dests:
            # dest_dict is a dict now!
            if dest_dict.get("approval_status") == "pending":
                # Get user who requested
                requested_user = None
                req_by = dest_dict.get("requested_by")
                if req_by:
                    requested_user = await User.get(req_by)
                
                pending_destinations.append(
                    DestinationApprovalResponse(
                        id=dest_dict["id"],
                        name=dest_dict["name"],
                        type=dest_dict["type"],
                        url=dest_dict.get("config", {}).get("url"),
                        customer_id=str(customer.id),
                        customer_name=customer.name,
                        requested_by=str(req_by) if req_by else "Unknown",
                        requested_by_email=requested_user.email if requested_user else None
                    )
                )
    
    return pending_destinations


@router.post("/destinations/{destination_id}/approve")
async def approve_destination(
    destination_id: str,
    current_user: User = Depends(deps.require_permission(Permission.APPROVE_DESTINATIONS))
):
    """
    Approve a pending destination (Requires APPROVE_DESTINATIONS).
    """
    from app.services.email_service import send_email
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Update destination directly in its collection
    result = await Destination.find_one(
        Destination.id == PydanticObjectId(destination_id),
        Destination.tenant_id == current_user.tenant_id
    ).update(
        {"$set": {
            "approval_status": "approved",
            "approved_by": str(current_user.id),
            "approval_date": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Destination not found")
        
    destination = await Destination.get(destination_id)
    # Check string id in list
    customer = await Customer.find_one({"tenant_id": current_user.tenant_id, "destinations": destination_id})
    
    logger.info(f"Destination approved: {destination.name} by {current_user.email}")
    
    # Send notification to user who requested
    if destination.requested_by:
        try:
            requested_user = await User.get(destination.requested_by)
            if requested_user:
                from app.services.email_service import send_destination_approved_email
                await send_destination_approved_email(
                     requester_email=requested_user.email,
                     destination_name=destination.name,
                     approver_email=current_user.email
                )
        except Exception as e:
            logger.error(f"Failed to send approval notification: {e}")
    
    return {"message": "Destination approved successfully", "destination": destination}


@router.post("/destinations/{destination_id}/reject")
async def reject_destination(
    destination_id: str,
    payload: RejectDestination,
    current_user: User = Depends(deps.require_admin)
):
    """
    Reject a pending destination (Admin only).
    """
    from app.services.email_service import send_email
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Update destination directly in its collection
    result = await Destination.find_one(
        Destination.id == PydanticObjectId(destination_id),
        Destination.tenant_id == current_user.tenant_id
    ).update(
        {"$set": {
            "approval_status": "rejected",
            "approved_by": str(current_user.id),
            "approval_date": datetime.utcnow(),
            "rejection_reason": payload.reason
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Destination not found")
        
    destination = await Destination.get(destination_id)
    customer = await Customer.find_one(Customer.tenant_id == current_user.tenant_id, Customer.destinations.id == PydanticObjectId(destination_id))
    
    logger.info(f"Destination rejected: {destination.name} by {current_user.email}")
    
    # Send notification to user who requested
    if destination.requested_by:
        try:
            requested_user = await User.get(destination.requested_by)
            if requested_user:
                from app.services.email_service import send_destination_rejected_email
                await send_destination_rejected_email(
                    requester_email=requested_user.email,
                    destination_name=destination.name,
                    rejecter_email=current_user.email,
                    reason=payload.reason
                )
        except Exception as e:
            logger.error(f"Failed to send rejection notification: {e}")
    
    return {"message": "Destination rejected successfully", "destination": destination}


@router.get("/destinations/{destination_id}/email-action", response_class=HTMLResponse)
async def email_destination_action(
    destination_id: str,
    action: Literal["approve", "reject"],
    token: str
):
    """
    Handle one-click approval/rejection from email links.
    """
    expected = hashlib.sha256(f"{destination_id}{settings.SECRET_KEY}".encode()).hexdigest()
    if token != expected:
        return """
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f8fafc;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <h2 style="color: #e11d48; margin-bottom: 20px;">Invalid or Expired Link</h2>
                    <p style="color: #475569;">The link you followed is invalid or has expired for security reasons.</p>
                    <a href="{settings.FRONTEND_URL}/" style="display: inline-block; margin-top: 20px; color: #3b82f6; text-decoration: none;">Return to Dashboard</a>
                </div>
            </body>
        </html>
        """

    dest = await Destination.get(destination_id)
    if not dest:
        return "<html><body><h2>Destination not found</h2></body></html>"
    
    if dest.approval_status != "pending":
        return f"""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f8fafc;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <h2 style="color: #334155; margin-bottom: 20px;">Action Already Taken</h2>
                    <p style="color: #475569;">This destination has already been <strong>{dest.approval_status}</strong>.</p>
                    <a href="{settings.FRONTEND_URL}/" style="display: inline-block; margin-top: 20px; color: #3b82f6; text-decoration: none;">Go to Dashboard</a>
                </div>
            </body>
        </html>
        """

    # Fetch customer for notification context
    customer = await Customer.find_one({"destinations": destination_id})

    if action == "approve":
        dest.approval_status = "approved"
        dest.approval_date = datetime.utcnow()
        dest.approved_by = "email-action"
        await dest.save()
        
        # Notify requester
        if dest.requested_by:
            requester = await User.get(dest.requested_by)
            if requester:
                from app.services.email_service import send_destination_approved_email
                await send_destination_approved_email(
                        requester_email=requester.email,
                        destination_name=dest.name,
                        approver_email="Administrator (via Email)"
                )
        
        return f"""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f8fafc;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-top: 5px solid #16a34a;">
                    <h2 style="color: #16a34a; margin-bottom: 20px;">Successfully Approved!</h2>
                    <p style="color: #475569;">The destination <strong>{dest.name}</strong> for <strong>{customer.name if customer else 'N/A'}</strong> has been activated.</p>
                    <p style="color: #475569;">The requester has been notified.</p>
                    <a href="{settings.FRONTEND_URL}/" style="display: inline-block; margin-top: 20px; color: #3b82f6; text-decoration: none;">Go to Dashboard</a>
                </div>
            </body>
        </html>
        """
    else:
        dest.approval_status = "rejected"
        dest.approval_date = datetime.utcnow()
        dest.approved_by = "email-action"
        dest.rejection_reason = "Rejected via email link"
        await dest.save()
        
        # Notify requester
        if dest.requested_by:
            requester = await User.get(dest.requested_by)
            if requester:
                from app.services.email_service import send_destination_rejected_email
                await send_destination_rejected_email(
                    requester_email=requester.email,
                    destination_name=dest.name,
                    rejecter_email="Administrator (via Email)",
                    reason=dest.rejection_reason
                )
        
        return f"""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f8fafc;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-top: 5px solid #e11d48;">
                    <h2 style="color: #e11d48; margin-bottom: 20px;">Destination Rejected</h2>
                    <p style="color: #475569;">The destination <strong>{dest.name}</strong> has been rejected.</p>
                    <p style="color: #475569;">The requester has been notified.</p>
                    <a href="{settings.FRONTEND_URL}/" style="display: inline-block; margin-top: 20px; color: #3b82f6; text-decoration: none;">Go to Dashboard</a>
                </div>
            </body>
        </html>
        """
