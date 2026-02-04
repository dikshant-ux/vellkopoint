from fastapi import FastAPI, Request
from app.core.config import settings
from app.api.v1.router import api_router
from contextlib import asynccontextmanager
from app.core.db import init_db
from app.core.redis_manager import redis_manager
from app.utils.cache_warmer import warm_all_caches
import logging
import time

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Waypoint application...")
    await init_db()
    
    # Warm caches on startup
    try:
        await warm_all_caches()
    except Exception as e:
        logger.warning(f"Cache warming failed (non-critical): {e}")
    
    logger.info("✅ Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Waypoint application...")
    await redis_manager.close_all()
    logger.info("✅ Application shutdown complete")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    # In production, we should only allow the frontend URL
    # In development, we can allow localhost
    allow_origins=[settings.FRONTEND_URL] if settings.ENVIRONMENT == "production" else [settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # cache preflight for 24h
)

# Trust moved to this middleware to handle HTTPS behind proxy correctly
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")



# Performance Logging Middleware
@app.middleware("http")
async def performance_logging(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000  # Convert to ms
    
    # Add performance header
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    
    # Add rate limit headers if available
    if hasattr(request.state, "rate_limit_info"):
        info = request.state.rate_limit_info
        response.headers["X-RateLimit-Limit"] = str(info.get("limit", ""))
        response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", ""))
        response.headers["X-RateLimit-Reset"] = str(info.get("reset", ""))
    
    # Log slow requests
    if process_time > 1000:  # > 1 second
        logger.warning(f"⚠️ Slow request: {request.method} {request.url.path} took {process_time:.2f}ms")
    
    return response

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Waypoint Data Router",
        "version": "0.2.0",
        "status": "production-ready"
    }