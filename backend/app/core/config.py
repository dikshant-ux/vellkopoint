from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vellkopoint"
    API_V1_STR: str = "/api/v1"
    MONGODB_URI: str
    
    # Redis - Separated by purpose for production
    REDIS_CACHE_URL: str
    REDIS_CELERY_URL: str
    REDIS_SESSION_URL: str
    
    # Legacy support (uses Celery URL if not overridden)
    REDIS_URL: str = ""
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    
    FRONTEND_URL: str
    BACKEND_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 1
    REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER_ME: int = 30
    ENVIRONMENT: str = "development" # "development" or "production"

    # SMTP Settings
    SMTP_SERVER: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAILS_FROM_EMAIL: str = "noreply@vellkopoint.com"
    EMAILS_FROM_NAME: str = "Vellkopoint"
    
    # Cache Configuration
    CACHE_DEFAULT_TTL: int = 300  # 5 minutes default
    CACHE_MAX_MEMORY: str = "256mb"  # Redis max memory
    CACHE_EVICTION_POLICY: str = "allkeys-lru"  # Evict least recently used
    CACHE_ENABLED: bool = True
    
    # Monitoring
    ENABLE_METRICS: bool = True
    ENABLE_CACHE_LOGGING: bool = True
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()