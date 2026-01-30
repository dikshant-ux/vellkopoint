"""
Migration script to backfill human-readable lead_id (LD-XXXXXX format)
for all existing leads in the database.
"""

import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.lead import Lead
import os
from dotenv import load_dotenv

load_dotenv()

async def backfill_lead_ids():
    """
    Backfill lead_id for all existing leads.
    """
    # Initialize database connection
    mongo_url = os.getenv("MONGODB_URI", "mongodb://localhost:27017/waypoint_db")
    # Extract database name from URI if present
    db_name = mongo_url.split("/")[-1] if "/" in mongo_url else "waypoint_db"
    
    client = AsyncIOMotorClient(mongo_url)
    database = client[db_name]
    
    await init_beanie(
        database=database,
        document_models=[Lead]
    )
    
    print(f"Starting migration to backfill lead_ids in database: {db_name}...")
    
    # Get all leads without a lead_id
    leads = await Lead.find({"lead_id": None}).to_list()
    
    print(f"Found {len(leads)} leads without lead_id")
    
    updated_count = 0
    error_count = 0
    
    for lead in leads:
        try:
            # Generate human-readable lead_id: LD-{last_6_chars_of_id_uppercase}
            lead.lead_id = f"LD-{str(lead.id)[-6:].upper()}"
            await lead.save()
            updated_count += 1
            if updated_count % 100 == 0:
                print(f"  Updated {updated_count} leads...")
        
        except Exception as e:
            error_count += 1
            print(f"  Error processing lead {lead.id}: {e}")
    
    print(f"\nMigration complete!")
    print(f"  Successfully updated: {updated_count} leads")
    print(f"  Errors: {error_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(backfill_lead_ids())
