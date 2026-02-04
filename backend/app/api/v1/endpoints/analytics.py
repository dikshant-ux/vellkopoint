from fastapi import APIRouter, Depends, Request, Response, HTTPException
from app.services.analytics import AnalyticsEngine
from app.api import deps
from app.utils.cache import cache
from app.models.user import User
from app.models.vendor import Vendor
from app.models.campaign import Campaign
from app.models.customer import Customer
from app.models.destination import Destination

from app.core.permissions import Permission

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    request: Request,
    response: Response,
    period: str = "24h",
    current_user: User = Depends(deps.require_permission(Permission.VIEW_ANALYTICS))
):
    # No caching for real-time data
    response.headers["Cache-Control"] = "no-store"
    stats = await AnalyticsEngine.get_stats(str(current_user.id), getattr(current_user, "tenant_id", None), period)
    return stats

@router.get("/connections")
async def get_connections(
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get all entities for the connection graph.
    """
    if not current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # unique to owner/tenant
    # For now, simplistic fetching
    # In real app, filter by tenant_id
    
    vendors = await Vendor.find(Vendor.tenant_id == current_user.tenant_id).to_list()
    campaigns = await Campaign.find(Campaign.tenant_id == current_user.tenant_id).to_list()
    customers = await Customer.find(Customer.tenant_id == current_user.tenant_id).to_list()
    destinations = await Destination.find(Destination.tenant_id == current_user.tenant_id).to_list()
    
    return {
        "vendors": vendors,
        "campaigns": campaigns,
        "customers": customers,
        "destinations": destinations
    }
