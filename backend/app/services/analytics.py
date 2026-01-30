from datetime import datetime, timedelta
from app.models.analytics import AnalyticsEvent
from app.models.vendor import Vendor
from app.models.vendor import Source

class AnalyticsEngine:
    @staticmethod
    async def log_event(event_type: str, source_id: str, owner_id: str, **kwargs):
        """
        Logs an analytics event asynchronously.
        """
        event = AnalyticsEvent(
            event_type=event_type,
            source_id=source_id,
            owner_id=owner_id,
            timestamp=datetime.utcnow(),
            **kwargs
        )
        await event.create()
        return event

    @staticmethod
    async def get_stats(owner_id: str, tenant_id: str = None, period: str = "24h"):
        """
        Computes aggregate stats for the dashboard.
        """
        now = datetime.utcnow()
        if period == "24h":
            start_time = now - timedelta(hours=24)
        elif period == "7d":
            start_time = now - timedelta(days=7)
        else:
            start_time = now - timedelta(hours=24)
            
        # MongoDB Aggregation for counts
        
        try:
            from app.models.customer import Customer
            from app.models.customer import Customer
            from app.models.user import User
            from app.models.campaign import Campaign

            # Determine query filter
            vendor_filter = {"owner_id": owner_id}
            customer_filter = {"owner_id": owner_id}
            
            # For Events, we need a list of owner_ids if tenant_id is present (since events don't have tenant_id)
            event_owner_ids = [owner_id]

            if tenant_id:
                vendor_filter = {"tenant_id": tenant_id}
                customer_filter = {"tenant_id": tenant_id}
                
                # Fetch all users in tenant to aggregate events
                tenant_users = await User.find(User.tenant_id == tenant_id).to_list()
                event_owner_ids = [str(u.id) for u in tenant_users]

            # 1. Total Vendors
            total_vendors = await Vendor.find(vendor_filter).count()
            
            # 2. Active Sources
            pipeline = [
                {"$match": vendor_filter},
                {"$unwind": "$sources"},
                {"$match": {"sources.config.status": "enabled"}},
                {"$count": "count"}
            ]
            active_sources_res = await Vendor.get_pymongo_collection().aggregate(pipeline).to_list(None)
            active_sources = active_sources_res[0]["count"] if active_sources_res else 0

            # 3. Total Customers
            total_customers = await Customer.find(customer_filter).count()

            # 4. Active Campaigns
            # 4. Active Campaigns
            # We can query Campaign collection directly since it has owner_id/tenant_id
            campaign_filter = vendor_filter.copy() # Same filter (owner_id or tenant_id)
            campaign_filter["config.status"] = "enabled"
            
            active_campaigns = await Campaign.find(campaign_filter).count()

            # 5. Events Today
            events_today = await AnalyticsEvent.find(
                {"owner_id": {"$in": event_owner_ids}},
                AnalyticsEvent.timestamp >= start_time
            ).count()
            
            return {
                "total_vendors": total_vendors,
                "active_sources": active_sources,
                "total_customers": total_customers,
                "active_campaigns": active_campaigns,
                "events_period": events_today,
                "period": period
            }
        except Exception as e:
            print(f"Analytics Error: {str(e)}")
            # Return zero stats instead of 500 to keep dashboard alive
            return {
                "total_vendors": 0,
                "active_sources": 0,
                "events_period": 0,
                "period": period,
                "error": str(e)
            }
