from fastapi import APIRouter
from app.api.v1.endpoints import vendors, ingest, customers, analytics, sources, public, system_fields, unknown_fields, auth, leads, monitoring, users, roles, permissions

api_router = APIRouter()

@api_router.get("/health")
async def health_check():
    return {"status": "ok"}

api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(ingest.router, prefix="/source", tags=["ingest"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(system_fields.router, prefix="/system-fields", tags=["system-fields"])
api_router.include_router(unknown_fields.router, prefix="/unknown-fields", tags=["unknown-fields"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])