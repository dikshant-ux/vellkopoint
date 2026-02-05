import re
from datetime import datetime
from typing import Optional, Any, Literal
from app.models.unknown_field import UnknownField
from app.models.system_field import SystemField, AliasEntry
from app.models.vendor import Vendor, Source

class UnknownFieldService:
    @staticmethod
    def normalize_alias(val: str) -> str:
        if not val:
            return ""
        # Lowercase, trim, remove all non-alphanumeric
        return re.sub(r'[^a-z0-9]', '', val.lower().strip())

    @staticmethod
    async def track_unknown_field(source_id: str, field_name: str, sample_value: Any, owner_id: str, tenant_id: str) -> None:
        """
        Records an unknown field. If it already exists, increments count and updates last_seen.
        If it's new, creates a new record.
        """
        # Convert value to string for storage/display
        sample_str = str(sample_value) if sample_value is not None else None
        
        # Database lookup by field_name and tenant_id (and owner_id for safety)
        unknown = await UnknownField.find_one(
            UnknownField.field_name == field_name,
            UnknownField.tenant_id == tenant_id
        )
        
        if unknown:
            if unknown.status == "ignored":
                return
            
            unknown.detected_count += 1
            unknown.last_seen = datetime.utcnow()
            
            # Append new sample value if valid and different
            if sample_str:
                current_samples = unknown.sample_value.split(", ") if unknown.sample_value else []
                # Keep only last 5 distinct values to avoid bloating
                if sample_str not in current_samples:
                    current_samples.append(sample_str)
                    # Limit to last 5
                    if len(current_samples) > 5:
                        current_samples = current_samples[-5:]
                    unknown.sample_value = ", ".join(current_samples)
            
            await unknown.save()
        else:
            await UnknownField(
                owner_id=owner_id,
                tenant_id=tenant_id,
                source_id=source_id,
                field_name=field_name,
                sample_value=sample_str,
                detected_count=1,
                status="unmapped"
            ).insert()

    @staticmethod
    async def map_unknown_field(
        source_id: str, 
        vendor_field_name: str, 
        target_system_field: str,
        owner_id: str,
        tenant_id: str,
        is_new_system_field: bool = False,
        new_field_data: Optional[dict] = None,
        scope: Literal["global", "vendor", "source"] = "vendor",
        confidence: Literal["manual", "suggested", "magic"] = "manual"
    ):
        """
        Maps an unknown field to a system field.
        Optionally creates the system field first.
        Updates Source mapping rules with scoped propagation.
        Updates UnknownField status.
        Adds structured alias to SystemField.
        """
        
        # 0. Find current vendor and source info using tenant_id
        vendor = await Vendor.find_one({"sources.id": source_id, "tenant_id": tenant_id})
        if not vendor:
            # Fallback for older records or cross-check
            vendor = await Vendor.find_one({"sources.id": source_id, "owner_id": owner_id})
            
        if not vendor:
            raise ValueError("Source not found")
        
        current_vendor_id = str(vendor.id)
        
        # 1. Create System Field if needed
        if is_new_system_field:
            if not new_field_data:
                raise ValueError("new_field_data required when is_new_system_field is True")
            
            new_field_data["field_key"] = target_system_field
            new_field_data["owner_id"] = owner_id
            new_field_data["tenant_id"] = tenant_id
            
            # Check existance by tenant
            existing = await SystemField.find_one(
                SystemField.field_key == target_system_field,
                SystemField.tenant_id == tenant_id
            )
            if existing:
                # User requested 'new', but it exists. 
                # Be 'tenant-wise' and reuse the existing one idempotently.
                # We could update the label/type here if we wanted, but generally we preserve existing.
                pass 
            else:
                system_field = SystemField(**new_field_data)
                await system_field.insert()
        else:
            exists = await SystemField.find_one(
                SystemField.field_key == target_system_field,
                SystemField.tenant_id == tenant_id
            )
            if not exists:
                # If mode is 'existing' but it doesn't exist, that's still an error
                raise ValueError(f"System field '{target_system_field}' does not exist")

        # 2. Identify all sources that have this unknown field
        # Query UnknownField to find all sources (within scope) that have 'vendor_field_name' as unmapped
        uf_query = {
            "field_name": vendor_field_name, 
            "tenant_id": tenant_id
        }
        if scope == "source":
            uf_query["source_id"] = source_id
        
        # Get list of source IDs that have this field
        # Note: Fetching full docs as Beanie projection requires a model class
        sources_with_field_docs = await UnknownField.find(uf_query).to_list()
        source_ids_with_field = {str(uf.source_id) for uf in sources_with_field_docs}
        
        # Always include the initiating source_id
        source_ids_with_field.add(source_id)

        # 3. Scoped Propagation
        criteria = {}
        if scope == "vendor":
            criteria = {"_id": vendor.id, "tenant_id": tenant_id} 
        elif scope == "source":
            criteria = {"sources.id": source_id, "tenant_id": tenant_id}
        # elif scope == "global": criteria = {"tenant_id": tenant_id}

        affected_source_ids = []
        vendors_to_update = await Vendor.find(criteria).to_list()
        
        for v in vendors_to_update:
            v_updated = False
            for s in v.sources:
                # If scope is source, strict match is already handled by query criteria, 
                # but we double check iteration here just in case.
                if scope == "source" and s.id != source_id:
                    continue
                
                should_update = False
                
                # Check 1: Does this source have an unmapped rule for this field?
                rule = next((r for r in s.mapping.rules if r.source_field == vendor_field_name), None)
                if rule and rule.target_field is None:
                    rule.target_field = target_system_field
                    should_update = True
                
                # Check 2: Does this source HAVE the unknown field data (based on UnknownField record) 
                # OR is it the initiating source?
                # If so, and no rule exists, add it.
                if (s.id == source_id or s.id in source_ids_with_field) and not rule:
                    from app.models.mapping import MappingRule
                    s.mapping.rules.append(MappingRule(source_field=vendor_field_name, target_field=target_system_field))
                    should_update = True
                
                if should_update:
                    v_updated = True
                    affected_source_ids.append(s.id)
            
            if v_updated:
                await v.save()

        # 4. Delete UnknownField record(s) - Filter by Tenant & Scope logic
        # We delete records for any source that we successfully updated mappings for
        if affected_source_ids:
             await UnknownField.find({
                 "field_name": vendor_field_name, 
                 "tenant_id": tenant_id,
                 "source_id": {"$in": affected_source_ids}
             }).delete()
            
        # 5. Universal Mapping (Scoped Alias)
        sys_field_doc = await SystemField.find_one(
            SystemField.field_key == target_system_field,
            SystemField.tenant_id == tenant_id
        )
        if sys_field_doc:
            alias_norm = UnknownFieldService.normalize_alias(vendor_field_name)
            
            # Check if this exact alias/scope/target already exists
            exists = any(
                a.alias_normalized == alias_norm and 
                a.scope == scope and 
                (a.vendor_id == current_vendor_id if scope == "vendor" else True)
                for a in sys_field_doc.aliases
            )
            
            if not exists:
                new_alias = AliasEntry(
                    alias_raw=vendor_field_name,
                    alias_normalized=alias_norm,
                    scope=scope,
                    confidence=confidence,
                    owner_id=owner_id,
                    vendor_id=current_vendor_id if scope == "vendor" else None,
                    source_id=source_id if scope == "source" else None
                )
                sys_field_doc.aliases.append(new_alias)
                await sys_field_doc.save()
            
        # 6. Trigger Retroactive Processing
        if affected_source_ids:
            from app.tasks.lead_tasks import reprocess_source_leads_task
            for sid in affected_source_ids:
                 reprocess_source_leads_task.delay(sid, tenant_id)

        return {"status": "success", "field": target_system_field, "affected_sources": len(affected_source_ids)}

    @staticmethod
    async def sync_source_mappings(source_id: str, mapping_rules: list, owner_id: str) -> None:
        """
        Synchronizes manual mappings from a source with the global unknown fields system.
        """
        for rule_data in mapping_rules:
            source_field = getattr(rule_data, "source_field", None) or rule_data.get("source_field")
            target_field = getattr(rule_data, "target_field", None) or rule_data.get("target_field")
            
            if target_field:
                try:
                    # Manual mappings from form defaults to 'vendor' scope and 'manual' confidence
                    await UnknownFieldService.map_unknown_field(
                        source_id=source_id,
                        vendor_field_name=source_field,
                        target_system_field=target_field,
                        owner_id=owner_id,
                        scope="vendor", # Default to vendor scope for manual form saves to avoid global collision
                        confidence="manual"
                    )
                except Exception as e:
                    print(f"Failed to sync mapping for {source_field}: {e}")
