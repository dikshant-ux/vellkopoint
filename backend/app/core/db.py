from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.analytics import AnalyticsEvent
from app.models.lead import Lead
from app.models.system_field import SystemField
from app.models.unknown_field import UnknownField
from app.models.user import User
from app.models.tenant import Tenant
from app.models.campaign import Campaign
from app.models.destination import Destination
from app.models.role import Role

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client.get_default_database(),
        document_models=[
            Vendor,
            Customer,
            AnalyticsEvent,
            Lead,
            SystemField,
            UnknownField,
            User,
            Tenant,
            Campaign,
            Destination,
            Role
        ]
    )
