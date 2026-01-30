"""
Quick diagnostic to check leads in database
"""

import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.lead import Lead
from app.models.customer import Customer
import os
from dotenv import load_dotenv

load_dotenv()

async def check_leads():
    # Initialize database connection
    mongo_url = os.getenv("MONGODB_URI", "mongodb://localhost:27017/waypoint_db")
    # Extract database name from URI if present
    db_name = mongo_url.split("/")[-1] if "/" in mongo_url else "waypoint_db"
    
    print(f"Connecting to: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    database = client[db_name]
    
    await init_beanie(
        database=database,
        document_models=[Lead, Customer]
    )
    
    # Count total leads
    total_leads = await Lead.count()
    print(f"\nTotal leads in database: {total_leads}")
    
    # Get one sample lead
    sample_lead = await Lead.find_one()
    if sample_lead:
        print(f"\nSample lead ID: {sample_lead.id}")
        print(f"Has routing_results: {len(sample_lead.routing_results) if sample_lead.routing_results else 0}")
        if sample_lead.routing_results:
            print(f"First routing result: {sample_lead.routing_results[0]}")
    
    # Try different queries
    leads_with_results_1 = await Lead.find({"routing_results": {"$exists": True}}).count()
    print(f"\nLeads with routing_results field (exists): {leads_with_results_1}")
    
    leads_with_results_2 = await Lead.find({"routing_results": {"$ne": []}}).count()
    print(f"Leads with non-empty routing_results: {leads_with_results_2}")
    
    leads_with_results_3 = await Lead.find({"routing_results.0": {"$exists": True}}).count()
    print(f"Leads with at least one routing result: {leads_with_results_3}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_leads())
