import httpx
from typing import Dict, Any
from app.models.customer import Customer, Destination
from app.models.campaign import Campaign

class DeliveryEngine:
    @staticmethod
    async def dispatch(payload: Dict[str, Any], campaign: Campaign, destination: Destination):
        """
        Dispatches payload to the destination defined in the campaign/customer.
        """
        config = destination.config
        url = config.url
        method = config.method.upper()
        headers = config.headers.copy()
        
        # Auth Handling
        if config.auth_type == "bearer":
            token = config.auth_credentials.get("token")
            if token:
                headers["Authorization"] = f"Bearer {token}"
        elif config.auth_type == "basic":
            # httpx handles basic auth separately usually, but we can bake into headers 
            # or pass auth tuple. For simplicity let's stick to headers if possible or refactor.
            pass
            
        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                if method == "POST":
                    response = await client.post(url, json=payload, headers=headers)
                elif method == "GET":
                    response = await client.get(url, params=payload, headers=headers)
                elif method == "PUT":
                    response = await client.put(url, json=payload, headers=headers)
                else:
                    raise ValueError(f"Unsupported method {method}")
                    
                response.raise_for_status()
                return {
                    "status": "success",
                    "code": response.status_code,
                    "response": response.text
                }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
