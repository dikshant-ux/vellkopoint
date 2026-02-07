import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.lead import Lead, RoutingResult
from app.models.customer import Customer, Destination
from app.models.campaign import Campaign
from app.services.processing_engine import ProcessingEngine

logger = logging.getLogger(__name__)

class RoutingEngine:
    @staticmethod
    async def find_eligible_campaigns(lead: Lead) -> List[tuple[Customer, Campaign]]:
        """
        Finds all active campaigns that match the lead's data.
        """
        eligible = []
        eligible = []
        try:
            # Query all enabled customers for tenant
            customers = await Customer.find(
                Customer.tenant_id == lead.tenant_id,
                Customer.status == "enabled"
            ).to_list()
            
            logger.info(f"Checking eligibility for lead {lead.id} against {len(customers)} enabled customers for tenant {lead.tenant_id}")
            
            for customer in customers:
                if not customer.campaigns:
                    continue
                    
                # Manually extract campaign IDs
                # customer.campaigns can be list of strings (IDs) or Link objects
                from beanie import PydanticObjectId
                campaign_ids = []
                for link in customer.campaigns:
                    if isinstance(link, str):
                        try:
                            campaign_ids.append(PydanticObjectId(link))
                        except:
                            pass
                    elif hasattr(link, 'ref') and link.ref.id:
                        campaign_ids.append(link.ref.id)
                
                logger.info(f"Customer {customer.name} has linked campaign IDs: {campaign_ids}")

                if not campaign_ids:
                    continue

                # Fetch active campaigns for this customer
                campaigns = await Campaign.find(
                    {
                        "_id": {"$in": campaign_ids},
                        "config.status": "enabled",
                        "tenant_id": lead.tenant_id
                    }
                ).to_list()

                for campaign in campaigns:
                    # Source Filtering
                    if campaign.source_ids and lead.source_id not in campaign.source_ids:
                        logger.info(f"Lead {lead.id} source {lead.source_id} not in allowed sources for campaign {campaign.name}")
                        continue
                    
                    # Check schedule & caps
                    is_available = await RoutingEngine.check_caps_and_schedule(campaign, lead.tenant_id)
                    if not is_available:
                        continue

                    # Check rules (Campaign filtering)
                    is_match = ProcessingEngine.evaluate_rules(lead.data, campaign.rules)
                    logger.info(f"Evaluating campaign {campaign.name} rules for lead {lead.id}: {'MATCH' if is_match else 'NO MATCH'}")
                    
                    if is_match:
                        eligible.append((customer, campaign))
                        
        except Exception as e:
            logger.error(f"Error finding eligible campaigns: {e}")
        
        return eligible
        
        return eligible

    @staticmethod
    async def execute_routing(lead_id: str):
        """
        Main entry point for routing a lead after ingestion.
        """
        from app.models.lead import Lead
        lead = await Lead.get(lead_id)
        if not lead:
            logger.error(f"Lead {lead_id} not found for routing")
            return
            
        if lead.status != "processed":
            logger.info(f"Lead {lead_id} status is {lead.status}, skipping routing")
            return
            
        eligible_campaigns = await RoutingEngine.find_eligible_campaigns(lead)
        logger.info(f"Found {len(eligible_campaigns)} eligible campaigns for lead {lead_id}")
        
        # Sort by priority (higher first)
        eligible_campaigns.sort(key=lambda x: x[1].config.priority, reverse=True)
        
        for customer, campaign in eligible_campaigns:
            # MVP: Deliver to ALL eligible campaigns
            # Future: Implement weighted distribution or single-target logic
            await RoutingEngine.deliver_to_campaign(lead, customer, campaign)

    @staticmethod
    async def deliver_to_campaign(lead: Lead, customer: Customer, campaign: Campaign):
        """
        Processes outbound mapping and sends lead to destination.
        """
        # 1. Find Destination
        # Direct fetch from DB instead of relying on customer linkage, as Campaigns explicitly link to a destination.
        destination = await Destination.get(campaign.destination_id)
        
        if not destination or not destination.enabled:
            logger.warning(f"Destination {campaign.destination_id} not found or disabled for campaign {campaign.name}")
            return
        
        # 1b. Check Approval Status - Only deliver to approved destinations
        if destination.approval_status != "approved":
            logger.warning(f"Destination {destination.name} is not approved (status: {destination.approval_status}). Skipping delivery for campaign {campaign.name}")
            return
            
        # 2. Apply Outbound Mapping
        # We reuse apply_mapping but with auto_discover=False
        # source_id="routing" is a placeholder
        outbound_data = await ProcessingEngine.apply_mapping(
            payload=lead.data, 
            mapping=campaign.mapping, 
            source_id="routing",
            owner_id=lead.owner_id,
            tenant_id=lead.tenant_id,
            auto_discover=False
        )
        
        # 2b. Inject Static Custom Fields
        # Static fields are hardcoded values that get added to every delivery
        for rule in campaign.mapping.rules:
            if rule.is_static and rule.target_field and rule.default_value:
                outbound_data[rule.target_field] = rule.default_value
                logger.debug(f"Added static field {rule.target_field}={rule.default_value} to campaign {campaign.name}")
        
        # 3. Deliver via HTTP
        status = "delivered"
        error_message = None
        
        try:
            async with httpx.AsyncClient() as client:
                config = destination.config
                
                # Setup request
                req_kwargs = {
                    "headers": config.headers.copy(),
                    "timeout": config.timeout
                }

                # Determine how to send data
                if config.method == "GET":
                    req_kwargs["params"] = outbound_data
                elif config.content_type == "form":
                    req_kwargs["data"] = outbound_data
                else:
                    req_kwargs["json"] = outbound_data

                # Authentication handling (basic/bearer)
                if config.auth_type == "bearer" and "token" in config.auth_credentials:
                    req_kwargs["headers"]["Authorization"] = f"Bearer {config.auth_credentials['token']}"
                elif config.auth_type == "basic" and "username" in config.auth_credentials:
                    req_kwargs["auth"] = (config.auth_credentials["username"], config.auth_credentials.get("password", ""))

                # Log before sending
                if config.method == "GET":
                    # Correctly merge params for logging and request
                    url_obj = httpx.URL(config.url)
                    merged_params = url_obj.params.merge(outbound_data)
                    final_url = url_obj.copy_with(params=merged_params)
                    
                    # Update req_kwargs to use the merged params with the clean base URL
                    # This ensures what we log is exactly what we send
                    req_kwargs["params"] = merged_params
                    # We strip the query from the URL passed to request() since we pass it in params
                    # actually httpx handles it, but explicit is better for clarity here
                    
                    logger.info(f"Delivering to campaign {campaign.name} [GET] - Full URL: {final_url}")
                else:
                    logger.info(f"Delivering to campaign {campaign.name} [{config.method}] - URL: {config.url}")
                    logger.info(f"Payload ({config.content_type}): {outbound_data}")
                
                # If we merged params manually for GET, we strictly don't need to change config.url passed to client,
                # but to avoid double-merging confusion (though safe), let's just rely on httpx merging behavior 
                # OR pass the already param-stripped URL. 
                # Safest: Use config.url (httpx merges) and just trust our log which uses .merge() logic consistent with httpx.
                
                response = await client.request(config.method, config.url, **req_kwargs)
                response.raise_for_status()
                
        except Exception as e:
            logger.error(f"Delivery failed for campaign {campaign.name}: {e}")
            status = "failed"
            error_message = str(e)
            
        # 4. Record Result
        lead.routing_results.append(RoutingResult(
            customer_id=str(customer.id),
            customer_name=customer.name,
            campaign_id=str(campaign.id),
            campaign_name=campaign.name,
            destination_id=str(destination.id),
            destination_name=destination.name,
            status=status,
            error_message=error_message
        ))
        await lead.save()

    @staticmethod
    async def check_caps_and_schedule(campaign: Campaign, tenant_id: str) -> bool:
        """
        Verifies if the campaign is currently accepting leads based on schedule and caps.
        """
        config = campaign.config
        now = datetime.utcnow()
        
        # 1. Schedule Check (Time of Day)
        if not config.all_day:
            current_time_str = now.strftime("%H:%M")
            if config.start_time and current_time_str < config.start_time:
                logger.info(f"Campaign {campaign.name} schedule: Current time {current_time_str} is before start {config.start_time}")
                return False
            if config.end_time and current_time_str > config.end_time:
                logger.info(f"Campaign {campaign.name} schedule: Current time {current_time_str} is after end {config.end_time}")
                return False

        # 2. Daily Capping Check
        weekday = now.strftime("%A").lower()
        daily_cap = getattr(config, f"{weekday}_cap", None)
        
        if daily_cap is not None:
            # Query delivered leads for this campaign today
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            pipeline = [
                {"$match": {
                    "$elemMatch": {
                        "campaign_id": campaign.id,
                        "status": "delivered",
                        "delivered_at": {"$gte": today_start}
                    },
                    "tenant_id": tenant_id
                }},
                {"$count": "count"}
            ]
            agg_res = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(1)
            delivered_today = agg_res[0]["count"] if agg_res else 0
            
            if delivered_today >= daily_cap:
                logger.info(f"Campaign {campaign.name} cap: Daily limit reached ({delivered_today}/{daily_cap}) for {weekday}")
                return False

        # 3. Hourly Cap Check
        if config.hourly_cap is not None:
            hour_start = now.replace(minute=0, second=0, microsecond=0)
            pipeline = [
                {"$match": {
                    "$elemMatch": {
                        "campaign_id": campaign.id,
                        "status": "delivered",
                        "delivered_at": {"$gte": hour_start}
                    },
                    "tenant_id": tenant_id
                }},
                {"$count": "count"}
            ]
            agg_res = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(1)
            delivered_this_hour = agg_res[0]["count"] if agg_res else 0
            
            if delivered_this_hour >= config.hourly_cap:
                logger.info(f"Campaign {campaign.name} cap: Hourly limit reached ({delivered_this_hour}/{config.hourly_cap})")
                return False

        # 4. Campaign Max Check
        if config.campaign_max is not None:
            pipeline = [
                {"$match": {
                    "$elemMatch": {
                        "campaign_id": campaign.id,
                        "status": "delivered"
                    },
                    "tenant_id": tenant_id
                }},
                {"$count": "count"}
            ]
            agg_res = await Lead.get_pymongo_collection().aggregate(pipeline).to_list(1)
            total_delivered = agg_res[0]["count"] if agg_res else 0
            
            if total_delivered >= config.campaign_max:
                logger.info(f"Campaign {campaign.name} cap: Campaign max reached ({total_delivered}/{config.campaign_max})")
                return False

        return True
