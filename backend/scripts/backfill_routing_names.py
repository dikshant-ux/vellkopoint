"""
Migration script to backfill customer_name, campaign_name, and destination_name
in routing_results for existing leads.

Run this script once to update all existing leads with the missing names.
"""

import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.lead import Lead
from app.models.customer import Customer
import os
from dotenv import load_dotenv

load_dotenv()

async def backfill_routing_result_names():
    """
    Backfill customer_name, campaign_name, and destination_name in routing_results
    for all existing leads.
    """
    # Initialize database connection
    mongo_url = os.getenv("MONGODB_URI", "mongodb://localhost:27017/waypoint_db")
    # Extract database name from URI if present
    db_name = mongo_url.split("/")[-1] if "/" in mongo_url else "waypoint_db"
    
    client = AsyncIOMotorClient(mongo_url)
    database = client[db_name]
    
    await init_beanie(
        database=database,
        document_models=[Lead, Customer]
    )
    
    print("Starting migration to backfill routing result names...")
    
    # Get all leads that have routing results (with at least one result)
    leads = await Lead.find({"routing_results.0": {"$exists": True}}).to_list()
    
    print(f"Found {len(leads)} leads with routing results")
    
    updated_count = 0
    error_count = 0
    
    for lead in leads:
        try:
            modified = False
            
            for result in lead.routing_results:
                # Skip if names already exist
                if result.customer_name and result.campaign_name:
                    continue
                
                # Fetch customer
                customer = await Customer.get(result.customer_id)
                if not customer:
                    print(f"  Warning: Customer {result.customer_id} not found for lead {lead.id}")
                    continue
                
                # Find campaign
                campaign = next((c for c in customer.campaigns if c.id == result.campaign_id), None)
                if not campaign:
                    print(f"  Warning: Campaign {result.campaign_id} not found for lead {lead.id}")
                    continue
                
                # Find destination
                destination = next((d for d in customer.destinations if d.id == campaign.destination_id), None)
                
                # Update the result with names
                result.customer_name = customer.name
                result.campaign_name = campaign.name
                if destination:
                    result.destination_id = destination.id
                    result.destination_name = destination.name
                
                modified = True
            
            # Save the lead if any results were modified
            if modified:
                await lead.save()
                updated_count += 1
                if updated_count % 10 == 0:
                    print(f"  Updated {updated_count} leads...")
        
        except Exception as e:
            error_count += 1
            print(f"  Error processing lead {lead.id}: {e}")
    
    print(f"\nMigration complete!")
    print(f"  Successfully updated: {updated_count} leads")
    print(f"  Errors: {error_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(backfill_routing_result_names())
