from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.models.vendor import Source
from app.models.mapping import SourceMapping
from app.models.normalization import SourceNormalization
from app.models.rules import SourceRules, RuleGroup, RuleCondition

class ProcessingEngine:
    @staticmethod
    async def process_record(payload: Dict[str, Any], source: Source, owner_id: str, tenant_id: str, vendor_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Main entry point for processing a record through the pipeline:
        1. Mapping
        2. Normalization
        3. Duplicate Check
        4. Rules (Filtering)
        """
        # 1. Mapping
        mapped_data = await ProcessingEngine.apply_mapping(payload, source.mapping, source.id, owner_id, tenant_id, vendor_id=vendor_id)
        
        # 2. Normalization
        normalized_data = ProcessingEngine.apply_normalization(mapped_data, source.normalization)
        
        # 3. Duplicate Check
        dupe_error = await ProcessingEngine.check_duplicate(normalized_data, source)
        if dupe_error:
            # Check for Duplicate Redirect Strategy
            if source.config.duplicate_redirect_source_id:
                history = payload.get("_redirect_history", [])
                
                # Loop Protection: Don't redirect if we've already been there OR if circular
                if source.config.duplicate_redirect_source_id not in history and source.id not in history:
                    try:
                        # Circular import avoidance
                        from app.tasks.lead_tasks import process_lead_task
                        
                        new_payload = payload.copy()
                        new_history = history + [source.id]
                        new_payload["_redirect_history"] = new_history
                        new_payload["_diverted_from"] = source.id
                        
                        # Dispatch task for the target source
                        # Assuming same vendor/owner/tenant
                        process_lead_task.delay(
                            payload=new_payload,
                            source_id=source.config.duplicate_redirect_source_id,
                            vendor_id=vendor_id if vendor_id else "unknown", # Best effort if not passed
                            owner_id=owner_id,
                            tenant_id=tenant_id
                        )
                        
                        dupe_error = f"Duplicate - Diverted to {source.config.duplicate_redirect_source_id}"
                    except Exception as e:
                        print(f"Failed to redirect duplicate: {e}")
                        
            normalized_data["_rejected"] = True
            normalized_data["_rejection_reason"] = dupe_error

        # 4. Rules (Filtering)
        if not normalized_data.get("_rejected"):
            if not ProcessingEngine.evaluate_rules(normalized_data, source.rules):
                normalized_data["_rejected"] = True
                normalized_data["_rejection_reason"] = "Source rules failed"
        
        # 5. Persistence
        from app.models.lead import Lead
        
        status = "processed"
        rejection_reason = None
        
        if normalized_data.get("_rejected"):
            status = "rejected"
            rejection_reason = normalized_data.get("_rejection_reason")
        
        # Sanitize 'language' field to prevent MongoDB text index errors
        # MongoDB text indexes try to use 'language' field for stemming override, 
        # crashing if value is invalid (e.g. 'en ').
        if "language" in normalized_data:
            normalized_data["source_language"] = normalized_data.pop("language")
            
        # Also modify original_payload to prevent the same error (since it's also indexed)
        # We create a shallow copy to verify we don't mutate input, though in this flow usage it is fine
        final_payload = payload.copy()
        if "language" in final_payload:
            final_payload["source_language"] = final_payload.pop("language")
            
        lead_doc = Lead(
            owner_id=owner_id,
            tenant_id=tenant_id,
            vendor_id=vendor_id if vendor_id else "unknown",
            source_id=source.id,
            data=normalized_data,
            original_payload=final_payload,
            status=status,
            rejection_reason=rejection_reason
        )
        await lead_doc.insert()
        # Generate human-readable lead_id: LD-{last_6_chars_of_id_uppercase}
        lead_doc.lead_id = f"LD-{str(lead_doc.id)[-6:].upper()}"
        await lead_doc.save()
        
        normalized_data["_lead_id"] = str(lead_doc.id)
        normalized_data["lead_id"] = lead_doc.lead_id
            
        return normalized_data

    @staticmethod
    async def check_duplicate(payload: Dict[str, Any], source: Source) -> Optional[str]:
        if not source.config.dupe_check:
            return None
            
        fields_to_check = source.config.dupe_fields or ["email"]
        
        query_conditions = []
        for field in fields_to_check:
            val = payload.get(field)
            if val:
                query_conditions.append({f"data.{field}": val})
        
        if not query_conditions:
            return None
            
        operator = source.config.dupe_field_operator or "or"
        mongo_op = "$or" if operator == "or" else "$and"
        
        main_query = {mongo_op: query_conditions, "source_id": source.id}
        
        if source.config.dupe_check_days > 0:
            start_time = datetime.now() - timedelta(days=source.config.dupe_check_days)
            main_query["created_at"] = {"$gte": start_time}
            
        from app.models.lead import Lead
        existing = await Lead.find_one(main_query)
        if existing:
            return f"Duplicate lead found within {source.config.dupe_check_days} days" if source.config.dupe_check_days > 0 else "Duplicate lead found"
            
        return None

    @staticmethod
    async def apply_mapping(payload: Dict[str, Any], mapping: SourceMapping, source_id: str, owner_id: str, tenant_id: str, vendor_id: Optional[str] = None, auto_discover: bool = True) -> Dict[str, Any]:
        """
        Applies mapping rules to the payload.
        Uses scoped alias matching and normalization.
        """
        from app.models.system_field import SystemField
        from app.services.unknown_field_service import UnknownFieldService
        
        system_fields_docs = await SystemField.find(SystemField.tenant_id == tenant_id).to_list()
        system_field_keys = {f.field_key for f in system_fields_docs}
        mapped_source_fields = {r.source_field for r in mapping.rules}
        
        result = {}
        
        alias_map = {} 
        for sf in system_fields_docs:
            for alias_entry in sf.aliases:
                norm = alias_entry.alias_normalized
                if norm not in alias_map:
                    alias_map[norm] = []
                alias_map[norm].append({
                    "target_key": sf.field_key,
                    "scope": alias_entry.scope,
                    "owner_id": alias_entry.owner_id,
                    "vendor_id": alias_entry.vendor_id,
                    "source_id": alias_entry.source_id
                })

        async def persist_rule(s_id, src_field, tgt_field, o_id):
            try:
                from app.models.mapping import MappingRule
                from app.models.vendor import Vendor
                vendor_doc = await Vendor.find_one({"sources.id": s_id, "owner_id": o_id})
                if vendor_doc:
                    s_idx = next((i for i, s in enumerate(vendor_doc.sources) if s.id == s_id), None)
                    if s_idx is not None:
                        # Check if a rule for this source_field already exists
                        exists = any(r.source_field == src_field for r in vendor_doc.sources[s_idx].mapping.rules)
                        if not exists:
                            vendor_doc.sources[s_idx].mapping.rules.append(
                                MappingRule(source_field=src_field, target_field=tgt_field)
                            )
                            await vendor_doc.save()
            except Exception as e:
                print(f"Failed to auto-persist mapping rule: {e}")

        if auto_discover:
            for key, value in payload.items():
                if key in system_field_keys:
                    result[key] = value
                    if key not in mapped_source_fields:
                        await persist_rule(source_id, key, key, owner_id)
                        mapped_source_fields.add(key)
                    continue

                if key in mapped_source_fields:
                    continue

                norm_key = UnknownFieldService.normalize_alias(key)
                matches = alias_map.get(norm_key, [])
                
                target_sys_field = None
                for match in matches:
                    if match["scope"] == "source" and match["source_id"] == source_id:
                        target_sys_field = match["target_key"]
                        break
                
                if not target_sys_field:
                    for match in matches:
                        if match["scope"] == "vendor" and match["vendor_id"] == vendor_id:
                            target_sys_field = match["target_key"]
                            break
                
                if not target_sys_field:
                    for match in matches:
                        if match["scope"] == "global" or (match["owner_id"] == owner_id):
                            target_sys_field = match["target_key"]
                            break

                if target_sys_field:
                    # Found a match via alias!
                    result[target_sys_field] = value
                    await persist_rule(source_id, key, target_sys_field, owner_id)
                    mapped_source_fields.add(key)
                else:
                    # Truly an unknown field
                    await persist_rule(source_id, key, None, owner_id)
                    mapped_source_fields.add(key)
                    await UnknownFieldService.track_unknown_field(source_id, key, value, owner_id, tenant_id)

        # Prepare normalized payload map for smart fallback
        # Key: normalized key, Value: original key
        # We only build this if necessary to save perf, but for simplicity/safety we build once
        normalized_payload = {}
        for k in payload.keys():
            normalized_payload[k.lower().replace("_", "").replace(" ", "")] = k

        for rule in mapping.rules:
            # 1. Exact Match
            val = payload.get(rule.source_field)
            
            # 2. Smart Match Fallback
            if val is None:
                # Try to finding via normalized key
                search_key_norm = rule.source_field.lower().replace("_", "").replace(" ", "")
                found_key = normalized_payload.get(search_key_norm)
                if found_key:
                    val = payload[found_key]
            
            # 3. Default Value
            if val is None and rule.default_value:
                val = rule.default_value
            
            # 4. Apply to Result
            if val is not None and rule.target_field:
                result[rule.target_field] = val
            elif rule.is_required:
                # Log warning or track missing field
                # For now just print/log, but we don't block unless we implement strict mode
                # In strict mode we might raise an error or mark lead as rejected
                pass
        
        return result

    @staticmethod
    def apply_normalization(payload: Dict[str, Any], normalization: SourceNormalization) -> Dict[str, Any]:
        if not normalization.rules:
            return payload
        for rule in normalization.rules:
            if rule.field in payload:
                val = payload[rule.field]
                if rule.operation == "lowercase":
                    payload[rule.field] = str(val).lower()
                elif rule.operation == "uppercase":
                    payload[rule.field] = str(val).upper()
        return payload

    @staticmethod
    def evaluate_rules(payload: Dict[str, Any], rules: SourceRules) -> bool:
        if not rules.filtering:
            return True
        return ProcessingEngine.evaluate_group(payload, rules.filtering)

    @staticmethod
    def evaluate_group(payload: Dict[str, Any], group: RuleGroup) -> bool:
        results = []
        for condition in group.conditions:
            if isinstance(condition, RuleGroup):
                results.append(ProcessingEngine.evaluate_group(payload, condition))
            elif isinstance(condition, RuleCondition):
                results.append(ProcessingEngine.evaluate_condition(payload, condition))
        
        if not results:
            return True
        return all(results) if group.logic == "and" else any(results)

    @staticmethod
    def evaluate_condition(payload: Dict[str, Any], condition: RuleCondition) -> bool:
        field_val = payload.get(condition.field)
        target_val = condition.value
        
        if condition.op == "eq": return str(field_val) == str(target_val)
        if condition.op == "neq": return str(field_val) != str(target_val)
        if condition.op == "gt":
            try: return float(field_val) > float(target_val)
            except: return False
        if condition.op == "lt":
            try: return float(field_val) < float(target_val)
            except: return False
        if condition.op == "gte":
            try: return float(field_val) >= float(target_val)
            except: return False
        if condition.op == "lte":
            try: return float(field_val) <= float(target_val)
            except: return False
        if condition.op == "in": return field_val in target_val if isinstance(target_val, list) else str(field_val) in str(target_val)
        if condition.op == "nin": return field_val not in target_val if isinstance(target_val, list) else str(field_val) not in str(target_val)
        if condition.op == "contains": return str(target_val).lower() in str(field_val).lower()
        if condition.op == "regex":
            import re
            try: return bool(re.search(str(target_val), str(field_val)))
            except: return False
        return True
