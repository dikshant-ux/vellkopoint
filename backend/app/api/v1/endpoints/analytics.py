from fastapi import APIRouter, Depends, Request, Response
from app.services.analytics import AnalyticsEngine
from app.api import deps
from app.utils.cache import cache
from app.models.user import User

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
