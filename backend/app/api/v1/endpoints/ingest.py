from fastapi import APIRouter, Header, HTTPException, Depends, Request, BackgroundTasks
from typing import Dict, Any, Optional
from app.models.vendor import Vendor
from app.services.processing_engine import ProcessingEngine

router = APIRouter()

async def validate_source_api_key(
    source_id: str,
    request: Request,
    x_api_key: Optional[str] = Header(None)
):
    # Check if API key is in Header or Query Params
    api_key = x_api_key or request.query_params.get("api_key")
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API Key")

    # Find vendor that has this source
    vendor = await Vendor.find_one({
        "sources": {
            "$elemMatch": {
                "id": source_id,
                "api_key": api_key
            }
        }
    })
    
    if not vendor:
        raise HTTPException(status_code=403, detail="Invalid API Key or Source ID")
        
    # Extract the source object
    source = next((s for s in vendor.sources if s.id == source_id), None)
    return {"vendor": vendor, "source": source}

@router.api_route("/{source_id}/ingest", methods=["GET", "POST"])
async def ingest_data(
    source_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    auth = Depends(validate_source_api_key)
):
    """
    Ingest data for a specific source via GET or POST.
    """
    # Combine data from body (POST) or query params (GET)
    payload = {}
    if request.method == "POST":
        try:
            payload = await request.json()
        except:
            # Fallback to form data or just query params if JSON fails
            try:
                form_data = await request.form()
                payload = dict(form_data)
            except:
                payload = dict(request.query_params)
    else:
        payload = dict(request.query_params)

    # Remove api_key from payload if it was sent in query params
    payload.pop("api_key", None)

    source = auth["source"]
    vendor = auth["vendor"]
    owner_id = str(vendor.owner_id)
    vendor_id = str(vendor.id)
    tenant_id = vendor.tenant_id

    # Offload everything to Celery!
    from app.tasks.lead_tasks import process_lead_task
    process_lead_task.delay(
        payload=payload,
        source_id=source.id,
        vendor_id=vendor_id,
        owner_id=owner_id,
        tenant_id=tenant_id
    )

    return {
        "status": "received",
        "message": "Lead received and queued for processing",
        "source_id": source.id,
        "vendor_id": vendor_id
    }
