from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.customer import Customer
from app.models.lead import Lead

class CustomerAnalyticsService:
    @staticmethod
    async def get_customer_stats_table(tenant_id: str, search: str = "") -> List[Dict[str, Any]]:
        """
        Aggregates lead delivery stats for all customers across multiple timeframes.
        """
        # 1. Fetch Customers (filtering if search provided)
        query = {"tenant_id": tenant_id}
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        customers = await Customer.find(query).to_list()
        if not customers:
            return []

        # 2. Define Timeframes
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        last_week_start = today_start - timedelta(days=7)
        last_month_start = today_start - timedelta(days=30)
        ninety_days_start = today_start - timedelta(days=90)
        six_months_start = today_start - timedelta(days=180)
        last_year_start = today_start - timedelta(days=365)

        results = []

        for customer in customers:
            customer_id_str = str(customer.id)
            
            # Helper to query counts
            async def get_counts(start_date: datetime = None, end_date: datetime = None):
                match_query = {
                    "routing_results.customer_id": customer_id_str,
                    "tenant_id": tenant_id
                }
                
                # Time clamping
                time_query = {}
                if start_date:
                    time_query["$gte"] = start_date
                if end_date:
                    time_query["$lt"] = end_date
                
                if time_query:
                    match_query["created_at"] = time_query

                # We need to count based on the routing_results status for THIS customer
                # MongoDB aggregation is best here for performance
                pipeline = [
                    {"$match": match_query},
                    {"$unwind": "$routing_results"},
                    {"$match": {"routing_results.customer_id": customer_id_str}},
                    {"$group": {
                        "_id": None,
                        "assigned": {"$sum": 1},
                        "delivered": {"$sum": {"$cond": [{"$eq": ["$routing_results.status", "delivered"]}, 1, 0]}},
                        "rejected": {"$sum": {"$cond": [{"$in": ["$routing_results.status", ["failed", "rejected"]]}, 1, 0]}}
                    }}
                ]
                
                agg_res = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(1)
                if not agg_res:
                    return {"assigned": 0, "delivered": 0, "rejected": 0}
                return agg_res[0]

            # Collect stats for each timeframe
            today = await get_counts(start_date=today_start)
            yesterday = await get_counts(start_date=yesterday_start, end_date=today_start)
            last_week = await get_counts(start_date=last_week_start)
            last_month = await get_counts(start_date=last_month_start)
            ninety_days = await get_counts(start_date=ninety_days_start)
            six_months = await get_counts(start_date=six_months_start)
            last_year = await get_counts(start_date=last_year_start)
            all_time = await get_counts()

            results.append({
                "id": customer_id_str,
                "readable_id": customer.readable_id or customer_id_str[:8].upper(),
                "name": customer.name,
                "status": customer.status,
                "stats": {
                    "today": today,
                    "yesterday": yesterday,
                    "last_week": last_week,
                    "last_month": last_month,
                    "ninety_days": ninety_days,
                    "six_months": six_months,
                    "last_year": last_year,
                    "all_time": all_time
                }
            })

        return results
    @staticmethod
    async def get_campaign_stats_for_customer(customer_id: str, tenant_id: str) -> Dict[str, Any]:
        """
        Aggregates stats for ALL campaigns belonging to a specific customer.
        Returns a dict: { campaign_id: { today: {...}, yesterday: {...}, ... } }
        """
        # 1. Define Timeframes
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        last_week_start = today_start - timedelta(days=7)
        last_month_start = today_start - timedelta(days=30)
        ninety_days_start = today_start - timedelta(days=90)
        six_months_start = today_start - timedelta(days=180)
        last_year_start = today_start - timedelta(days=365)

        timeframe_configs = [
            ("today", today_start, None),
            ("yesterday", yesterday_start, today_start),
            ("last_week", last_week_start, None),
            ("last_month", last_month_start, None),
            ("ninety_days", ninety_days_start, None),
            ("six_months", six_months_start, None),
            ("last_year", last_year_start, None),
            ("all_time", None, None)
        ]

        # Initializing stats structure
        # We'll use a nested dict: results[campaign_id][timeframe_label] = stats
        campaign_stats = {}

        # 2. First pass: Collect all campaign IDs that have stats in ANY timeframe
        # This is more efficient than doing it inside the loop if we want full consistency
        all_campaign_ids = set()

        for label, start_date, end_date in timeframe_configs:
            match_query = {
                "routing_results.customer_id": customer_id,
                "tenant_id": tenant_id
            }
            
            time_query = {}
            if start_date:
                time_query["$gte"] = start_date
            if end_date:
                time_query["$lt"] = end_date
            
            if time_query:
                match_query["created_at"] = time_query

            pipeline = [
                {"$match": match_query},
                {"$unwind": "$routing_results"},
                {"$match": {"routing_results.customer_id": customer_id}},
                {"$group": {
                    "_id": "$routing_results.campaign_id",
                    "assigned": {"$sum": 1},
                    "delivered": {"$sum": {"$cond": [{"$eq": ["$routing_results.status", "delivered"]}, 1, 0]}},
                    "rejected": {"$sum": {"$cond": [{"$in": ["$routing_results.status", ["failed", "rejected"]]}, 1, 0]}}
                }}
            ]
            
            agg_results = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(None)
            
            for res in agg_results:
                camp_id = res["_id"]
                all_campaign_ids.add(camp_id)
                if camp_id not in campaign_stats:
                    campaign_stats[camp_id] = {l: {"assigned": 0, "delivered": 0, "rejected": 0} for l, _, _ in timeframe_configs}
                
                campaign_stats[camp_id][label] = {
                    "assigned": res["assigned"],
                    "delivered": res["delivered"],
                    "rejected": res["rejected"]
                }

        return campaign_stats
