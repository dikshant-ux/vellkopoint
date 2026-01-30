from fastapi import APIRouter, HTTPException, Response
from typing import Optional
from app.models.vendor import Vendor, Source
from pydantic import BaseModel

router = APIRouter()

class PublicSourceDocs(BaseModel):
    name: str
    source_id: str
    api_key: str
    type: str
    fields: list[dict]
    ingest_url: str

@router.get("/sources/{source_id}/docs", response_model=PublicSourceDocs)
async def get_public_source_docs(source_id: str, response: Response):
    # Cache for 1 day
    response.headers["Cache-Control"] = "public, max-age=86400"
    # Find vendor that contains this source
    vendor = await Vendor.find_one({"sources.id": source_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Source not found")
    
    source = next((s for s in vendor.sources if s.id == source_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Extract field requirements from mapping rules AND system fields
    from app.models.system_field import SystemField
    all_system_fields = await SystemField.find_all().to_list()
    
    # Map target_field -> rule
    mapping_dict = {}
    if source.mapping and source.mapping.rules:
        for rule in source.mapping.rules:
            if rule.target_field: # Skip unmapped/null targets
                mapping_dict[rule.target_field] = rule.source_field
    
    fields = []
    for sf in all_system_fields:
        vendor_field = mapping_dict.get(sf.field_key, sf.field_key)
        fields.append({
            "vendor_field": vendor_field,
            "system_field": sf.field_key,
            "required": sf.is_required
        })
        
    # Construct ingestion URL (assuming common pattern, in production this should be in config)
    # We use a placeholder that frontend will replace with actual window.location.host if needed
    # but backend can provide the path
    ingest_url = f"/source/{source.id}/ingest?api_key={source.api_key}"

    return PublicSourceDocs(
        name=source.name,
        source_id=source.id,
        api_key=source.api_key,
        type=source.type,
        fields=fields,
        ingest_url=ingest_url
    )
