"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Wand2, Filter, AlertCircle, X } from "lucide-react";
import { SmartMappingSheet } from "@/components/mapping/smart-mapping-sheet";
import { RuleBuilder, RuleGroup } from "@/components/mapping/rule-builder";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export interface MappingRule {
    source_field: string;
    target_field: string | null;
    default_value?: string;
    is_required?: boolean;
}

export interface SourceFormState {
    name: string;
    type: string;
    config: {
        status: "enabled" | "disabled";
        rate: string;
        api_key: string;
        dupe_check: boolean;
        dupe_check_days: number;
        dupe_fields: string[];
        dynamic_dupe_check: boolean;
        exclude_from_global_dupe_checks: boolean;
        append_dupes: boolean;
        use_as_suppression_list: boolean;
        send_filtered_leads_to: string;
        dupe_check_timeframe: "disabled" | "24h" | "7d" | "30d";
        dupe_field_1: string;
        dupe_field_2: string;
        dupe_field_operator: "or" | "and";
    };
    validation: {
        validation_type: string;
        validation_url: string;
        validation_field: string;
        validation_api_key: string;
    };
    mapping: {
        rules: MappingRule[];
    };
    rules: {
        filtering: RuleGroup;
    };
}

const INITIAL_FORM_STATE: SourceFormState = {
    name: "",
    type: "api",
    config: {
        status: "enabled",
        rate: "",
        api_key: "",
        dupe_check: false,
        dupe_check_days: 0,
        dupe_fields: [],
        dynamic_dupe_check: false,
        exclude_from_global_dupe_checks: false,
        append_dupes: false,
        use_as_suppression_list: false,
        send_filtered_leads_to: "",
        dupe_check_timeframe: "disabled",
        dupe_field_1: "",
        dupe_field_2: "",
        dupe_field_operator: "or",
    },
    validation: {
        validation_type: "",
        validation_url: "",
        validation_field: "",
        validation_api_key: "",
    },
    mapping: {
        rules: [],
    },
    rules: {
        filtering: {
            logic: "and",
            conditions: [],
        } as any,
    },
};

interface VendorSourceFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorId: string;
    vendorName: string;
    sourceId?: string | null;
    onSuccess: () => void;
}

export function VendorSourceFormDialog({
    open,
    onOpenChange,
    vendorId,
    vendorName,
    sourceId,
    onSuccess,
}: VendorSourceFormDialogProps) {
    const [pendingUnmappedFields, setPendingUnmappedFields] = useState<string[]>([]);
    const [isSmartMappingOpen, setIsSmartMappingOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<SourceFormState>(INITIAL_FORM_STATE);
    const [isLoading, setIsLoading] = useState(false);
    const [systemFields, setSystemFields] = useState<any[]>([]);

    // Memoize system fields to prevent re-rendering Select dropdowns
    const memoizedSystemFields = useMemo(() => systemFields, [systemFields]);

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const res = await api.get("/system-fields/");
                setSystemFields(res.data);
            } catch (error) {
                console.error("Failed to fetch system fields", error);
            }
        };
        fetchFields();
    }, []);

    const mode = sourceId ? "edit" : "create";

    useEffect(() => {
        if (open) {
            setPendingUnmappedFields([]); // Reset pending unmapped fields
            if (sourceId) {
                fetchSourceDetails(sourceId);
            } else {
                setForm(INITIAL_FORM_STATE);
            }
        }
    }, [open, sourceId]);

    const fetchSourceDetails = async (id: string) => {
        try {
            setIsLoading(true);
            const res = await api.get(`/vendors/${vendorId}/sources/${id}`);
            const source = res.data;

            if (source) {
                // Initialize dupe fields: prioritize new list, fallback to old fields, default to empty
                let initialDupeFields = source.config.dupe_fields || [];
                if (initialDupeFields.length === 0 && source.config.dupe_field_1) {
                    initialDupeFields.push(source.config.dupe_field_1);
                    if (source.config.dupe_field_2) {
                        initialDupeFields.push(source.config.dupe_field_2);
                    }
                }

                setForm({
                    name: source.name,
                    type: source.type,
                    config: {
                        status: source.config.status || "enabled",
                        rate: source.config.rate?.toString() || "",
                        api_key: source.api_key,
                        dupe_check: source.config.dupe_check === true || source.config.dupe_check === "enabled",
                        dupe_check_days: source.config.dupe_check_days || 0,
                        dupe_fields: initialDupeFields,
                        dynamic_dupe_check: source.config.dynamic_dupe_check || false,
                        exclude_from_global_dupe_checks: source.config.exclude_from_global_dupe_checks || false,
                        append_dupes: source.config.append_dupes || false,
                        use_as_suppression_list: source.config.use_as_suppression_list || false,
                        send_filtered_leads_to: source.config.send_filtered_leads_to || "",
                        dupe_check_timeframe: source.config.dupe_check_timeframe || "disabled",
                        dupe_field_1: source.config.dupe_field_1 || "",
                        dupe_field_2: source.config.dupe_field_2 || "",
                        dupe_field_operator: source.config.dupe_field_operator || "or",
                    },
                    validation: {
                        validation_type: source.validation?.validation_type || "",
                        validation_url: source.validation?.validation_url || "",
                        validation_field: source.validation?.validation_field || "",
                        validation_api_key: source.validation?.validation_api_key || "",
                    },
                    mapping: {
                        rules: source.mapping?.rules || [],
                    },
                    rules: {
                        filtering: source.rules?.filtering || { logic: "and", conditions: [] },
                    },
                });
            }
        } catch (error) {
            console.error("Failed to fetch source details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            setIsSaving(true);
            const payload = {
                name: form.name.trim(),
                type: form.type,
                config: {
                    status: form.config.status,
                    rate: form.config.rate === "" ? null : Number(form.config.rate),
                    dupe_check: form.config.dupe_check,
                    dupe_check_days: form.config.dupe_check_days,
                    dupe_fields: form.config.dupe_fields,
                    dynamic_dupe_check: form.config.dynamic_dupe_check,
                    exclude_from_global_dupe_checks: form.config.exclude_from_global_dupe_checks,
                    append_dupes: form.config.append_dupes,
                    use_as_suppression_list: form.config.use_as_suppression_list,
                    send_filtered_leads_to: form.config.send_filtered_leads_to || null,
                    dupe_check_timeframe: form.config.dupe_check_timeframe,
                    dupe_field_1: form.config.dupe_field_1 || null,
                    dupe_field_2: form.config.dupe_field_2 || null,
                    dupe_field_operator: form.config.dupe_field_operator,
                },
                validation: {
                    validation_type: form.validation.validation_type || null,
                    validation_url: form.validation.validation_url || null,
                    validation_field: form.validation.validation_field || null,
                    validation_api_key: form.validation.validation_api_key || null,
                },
                mapping: {
                    rules: form.mapping.rules.map(r => ({
                        ...r,
                        target_field: r.target_field || null
                    }))
                },
                rules: form.rules,
            };

            let savedSourceId = sourceId;
            if (mode === "edit" && sourceId) {
                await api.put(`/vendors/${vendorId}/sources/${sourceId}`, payload);
            } else {
                const res = await api.post(`/vendors/${vendorId}/sources`, payload);
                savedSourceId = res.data.id;
            }

            // Register unknown fields if any
            if (pendingUnmappedFields.length > 0 && savedSourceId) {
                await api.post("/unknown-fields/bulk-register", {
                    source_id: savedSourceId,
                    fields: pendingUnmappedFields
                });
            }

            onSuccess();
        } catch (error) {
            console.error("Failed to save source", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to update deeply nested state - memoized to prevent re-renders
    const updateForm = useCallback((updater: (prev: SourceFormState) => SourceFormState) => {
        setForm(prev => updater(prev));
    }, []);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>{mode === "edit" ? "Edit Source" : "Add Source"}</DialogTitle>
                    </DialogHeader>
                    {isLoading ? (
                        <div className="space-y-6 py-4 max-h-[75vh] overflow-auto pr-2 animate-pulse">
                            {/* Skeleton for Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-muted rounded"></div>
                                    <div className="h-10 bg-muted rounded"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-muted rounded"></div>
                                    <div className="h-10 bg-muted rounded"></div>
                                </div>
                            </div>

                            {/* Skeleton for Status Toggle */}
                            <div className="h-16 bg-muted/30 rounded-md border"></div>

                            {/* Skeleton for Duplicate Check */}
                            <div className="space-y-3">
                                <div className="h-16 bg-muted/50 rounded-md border"></div>
                                <div className="ml-2 pl-4 border-l-2 space-y-4 p-2">
                                    <div className="h-10 bg-muted rounded"></div>
                                    <div className="h-20 bg-muted rounded"></div>
                                </div>
                            </div>

                            {/* Skeleton for Mapping */}
                            <div className="space-y-3">
                                <div className="h-4 w-32 bg-muted rounded"></div>
                                <div className="h-10 bg-muted rounded"></div>
                                <div className="h-10 bg-muted rounded"></div>
                                <div className="h-10 bg-muted rounded"></div>
                            </div>

                            {/* Skeleton for Save Button */}
                            <div className="h-10 bg-muted rounded"></div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-4 max-h-[75vh] overflow-auto pr-2">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Vendor Name</Label>
                                    <Input value={vendorName} readOnly disabled className="bg-muted text-muted-foreground" />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="sourceName">Source Name</Label>
                                    <Input
                                        id="sourceName"
                                        value={form.name}
                                        onChange={(e) => updateForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Website Signup"
                                    />
                                </div>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-md border">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Source Status</Label>
                                    <div className="text-xs text-muted-foreground">
                                        {form.config.status === "enabled" ? "Accepting leads from this source" : "Source is disabled"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.config.status === "enabled"}
                                        onCheckedChange={(checked) =>
                                            updateForm(p => ({ ...p, config: { ...p.config, status: checked ? "enabled" : "disabled" } }))
                                        }
                                    />
                                    <Badge variant={form.config.status === "enabled" ? "default" : "secondary"}>
                                        {form.config.status === "enabled" ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                            </div>


                            {/* Duplicate Check Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Duplicate Check</Label>
                                        <div className="text-xs text-muted-foreground">
                                            Check for duplicates before accepting leads
                                        </div>
                                    </div>
                                    <Switch
                                        checked={form.config.dupe_check}
                                        onCheckedChange={(checked) => {
                                            // Set default field if enabling regarding of dupe_fields state
                                            const shouldInitialize = checked && (!form.config.dupe_fields || form.config.dupe_fields.length === 0);

                                            updateForm(p => ({
                                                ...p,
                                                config: {
                                                    ...p.config,
                                                    dupe_check: checked,
                                                    dupe_fields: shouldInitialize ? ["email"] : p.config.dupe_fields
                                                }
                                            }))
                                        }}
                                    />
                                </div>

                                {form.config.dupe_check && (
                                    <div className="ml-2 pl-4 border-l-2 border-muted space-y-4 p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {/* Days Configuration */}
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label>Re-accept after (Days)</Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {form.config.dupe_check_days === 0 ? "(0 = Never accept duplicates)" : "(Days before re-accepting)"}
                                                </span>
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={form.config.dupe_check_days}
                                                onChange={(e) => updateForm(p => ({ ...p, config: { ...p.config, dupe_check_days: parseInt(e.target.value) || 0 } }))}
                                            />
                                        </div>

                                        {/* Dupe Fields Configuration */}
                                        <div className="space-y-3">
                                            <Label>Fields to Check for Duplicates</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {form.config.dupe_fields?.map((field, index) => (
                                                    <div key={index} className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 px-2 py-1 rounded-md text-sm">
                                                        <span>{field}</span>
                                                        <button
                                                            className="text-purple-400 hover:text-purple-900 transition-colors"
                                                            onClick={() => {
                                                                const newFields = form.config.dupe_fields.filter((_, i) => i !== index);
                                                                updateForm(p => ({ ...p, config: { ...p.config, dupe_fields: newFields } }));
                                                            }}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}

                                                <div className="flex items-center gap-2">
                                                    {/* Simple Add Field Input */}
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-[180px]">
                                                            <Select
                                                                value=""
                                                                onValueChange={(val) => {
                                                                    if (val && !form.config.dupe_fields.includes(val)) {
                                                                        updateForm(p => ({ ...p, config: { ...p.config, dupe_fields: [...p.config.dupe_fields, val] } }));
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs">
                                                                    <SelectValue placeholder="Add field..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {memoizedSystemFields.map((sf) => (
                                                                        <SelectItem key={sf.field_key} value={sf.field_key} className="text-xs">
                                                                            {sf.label} ({sf.field_key})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                * Leads matching ANY of these fields will be considered duplicates.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Validation Check Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Validation Check</Label>
                                        <div className="text-xs text-muted-foreground">
                                            Enable extensive validation and filtering
                                        </div>
                                    </div>
                                    <Switch
                                        checked={form.config.dynamic_dupe_check}
                                        onCheckedChange={(checked) => updateForm(p => ({ ...p, config: { ...p.config, dynamic_dupe_check: checked } }))}
                                    />
                                </div>
                            </div>

                            {/* Conditional Sections - Only visible if Dynamic Dupe Check is enabled */}
                            {form.config.dynamic_dupe_check && (
                                <div className="space-y-6 pt-4 border-t animate-in fade-in zoom-in-95 duration-200">
                                    {/* Filtering Rules */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Filter className="w-4 h-4 text-purple-600" />
                                            <div className="text-sm font-semibold">Filtering Rules</div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-md border">
                                            <p className="text-xs text-muted-foreground mb-4">
                                                Define rules to filter out leads before they are accepted. Leads matching these rules will be rejected.
                                            </p>
                                            <RuleBuilder
                                                rule={form.rules.filtering}
                                                onChange={(newRule) => updateForm(p => ({ ...p, rules: { ...p.rules, filtering: newRule } }))}
                                                systemFields={memoizedSystemFields}
                                            />
                                        </div>
                                    </div>

                                    {/* Validation Settings */}
                                    <div>
                                        <div className="text-sm font-semibold mb-3">Third-Party Validation</div>
                                        <div className="grid gap-4 bg-slate-50 p-4 rounded-md border">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Validation Type</Label>
                                                    <Select
                                                        value={form.validation.validation_type}
                                                        onValueChange={(val) =>
                                                            updateForm((p) => ({
                                                                ...p,
                                                                validation: { ...p.validation, validation_type: val },
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger className="h-10 text-sm w-full">
                                                            <SelectValue placeholder="(none)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">(none)</SelectItem>
                                                            <SelectItem value="http">HTTP</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Validation Field</Label>
                                                    <Select
                                                        value={form.validation.validation_field}
                                                        onValueChange={(val) =>
                                                            updateForm((p) => ({
                                                                ...p,
                                                                validation: { ...p.validation, validation_field: val },
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger className="h-10 text-sm w-full">
                                                            <SelectValue placeholder="(none)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">(none)</SelectItem>
                                                            {memoizedSystemFields.map((sf) => (
                                                                <SelectItem key={sf.field_key} value={sf.field_key}>
                                                                    {sf.label} ({sf.field_key})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Validation URL</Label>
                                                <Input
                                                    value={form.validation.validation_url}
                                                    onChange={(e) =>
                                                        updateForm((p) => ({ ...p, validation: { ...p.validation, validation_url: e.target.value } }))
                                                    }
                                                    placeholder="https://api.validator.com/check"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Validation API Key</Label>
                                                <Input
                                                    value={form.validation.validation_api_key}
                                                    onChange={(e) =>
                                                        updateForm((p) => ({
                                                            ...p,
                                                            validation: { ...p.validation, validation_api_key: e.target.value },
                                                        }))
                                                    }
                                                    type="password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mapping - Always Visible */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-sm font-semibold">Field Mapping</div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] gap-1 px-2 border-purple-200 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                        onClick={() => setIsSmartMappingOpen(true)}
                                    >
                                        <Wand2 className="w-3 h-3 text-purple-600" />
                                        Magic Map
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 font-medium text-xs text-muted-foreground px-1">
                                        <div>Vendor Field Name</div>
                                        <div>Internal Field Name</div>
                                    </div>
                                    {form.mapping.rules.map((rule, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <Input
                                                placeholder="e.g. email_address"
                                                className="h-9 px-3 py-1"
                                                value={rule.source_field}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newRules = [...form.mapping.rules];
                                                    newRules[idx].source_field = val;

                                                    // Auto-detect target field if not already set
                                                    if (val && !newRules[idx].target_field) {
                                                        const normalize = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
                                                        const normVal = normalize(val);

                                                        const matchedField = memoizedSystemFields.find(sf => {
                                                            const sfKeyNorm = normalize(sf.field_key);
                                                            const sfLabelNorm = normalize(sf.label);

                                                            // Match key, label, or any alias
                                                            if (normVal === sfKeyNorm || normVal === sfLabelNorm) return true;

                                                            return (sf.aliases || []).some((a: any) => {
                                                                // Handle both old string aliases and new structured ones
                                                                const aliasNorm = typeof a === 'string' ? normalize(a) : a.alias_normalized;
                                                                return normVal === aliasNorm;
                                                            });
                                                        });

                                                        if (matchedField) {
                                                            newRules[idx].target_field = matchedField.field_key;
                                                        }
                                                    }

                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                }}
                                            />
                                            <div className="w-full">
                                                <div className="w-full">
                                                    <Select
                                                        value={rule.target_field || "__unmapped__"}
                                                        onValueChange={(val) => {
                                                            const newRules = [...form.mapping.rules];
                                                            newRules[idx].target_field = val === "__unmapped__" ? null : val;
                                                            updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9 text-sm w-full">
                                                            <SelectValue placeholder="Select Field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__unmapped__" className="text-muted-foreground italic">
                                                                (Unmapped)
                                                            </SelectItem>
                                                            {memoizedSystemFields.map((sf) => (
                                                                <SelectItem key={sf.field_key} value={sf.field_key}>
                                                                    {sf.field_key}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive h-8 w-8 shrink-0"
                                                onClick={() => {
                                                    const newRules = form.mapping.rules.filter((_, i) => i !== idx);
                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                        onClick={() =>
                                            updateForm(p => ({
                                                ...p,
                                                mapping: { rules: [...p.mapping.rules, { source_field: "", target_field: "" }] },
                                            }))
                                        }
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Mapping
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        * Mapping allows vendors to send data with any field names. Internal fields include email, phone, first_name, etc.
                                    </p>
                                </div>
                            </div>

                            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Source"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <SmartMappingSheet
                isOpen={isSmartMappingOpen}
                onClose={() => setIsSmartMappingOpen(false)}
                onApply={(rules, unmapped) => {
                    setPendingUnmappedFields(unmapped);
                    updateForm(prev => {
                        const existingRules = [...prev.mapping.rules];
                        rules.forEach(newRule => {
                            const index = existingRules.findIndex(r => r.source_field === newRule.source_field);
                            if (index !== -1) {
                                // Upsert: update target_field, keep default_value etc if any
                                existingRules[index] = { ...existingRules[index], ...newRule };
                            } else {
                                // Add new rule
                                existingRules.push(newRule as MappingRule);
                            }
                        });
                        return {
                            ...prev,
                            mapping: {
                                rules: existingRules
                            }
                        };
                    });
                }}
            />
        </>
    );
}
