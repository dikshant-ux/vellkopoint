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
import { Plus, Trash2, Filter, Info, ChevronDown, Check, Clock, Zap } from "lucide-react";
import { RuleBuilder, RuleGroup } from "@/components/mapping/rule-builder";
import { useEffect, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MappingRule {
    source_field: string; // This will be the INTERNAL field name
    target_field: string | null; // This will be the CUSTOMER field name
    default_value?: string;
    is_static?: boolean; // True = static custom field with hardcoded value
}

export interface CampaignFormState {
    name: string;
    description: string;
    destination_id: string;
    source_ids: string[];
    config: {
        status: "enabled" | "disabled";
        priority: number;
        weight: number;

        // Daily Capping
        monday_cap?: number;
        tuesday_cap?: number;
        wednesday_cap?: number;
        thursday_cap?: number;
        friday_cap?: number;
        saturday_cap?: number;
        sunday_cap?: number;

        // Scheduling
        all_day: boolean;
        start_time: string;
        end_time: string;

        // Global Limits
        campaign_max?: number;
        hourly_cap?: number;

        // Additional Controls
        allow_duplicates: "always" | "never" | "daily";
        send_failed_to?: string;
    };
    mapping: {
        rules: MappingRule[];
    };
    rules: {
        filtering: RuleGroup;
    };
}

const INITIAL_FORM_STATE: CampaignFormState = {
    name: "",
    description: "",
    destination_id: "",
    source_ids: [],
    config: {
        status: "enabled",
        priority: 0,
        weight: 100,
        all_day: true,
        start_time: "00:00",
        end_time: "23:59",
        allow_duplicates: "always",
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

interface CampaignFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    campaignId?: string | null;
    destinations: any[];
    onSuccess: () => void;
}

export function CampaignFormDialog({
    open,
    onOpenChange,
    customerId,
    campaignId,
    destinations,
    onSuccess,
}: CampaignFormDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<CampaignFormState>(INITIAL_FORM_STATE);
    const [isLoading, setIsLoading] = useState(false);
    const [systemFields, setSystemFields] = useState<any[]>([]);
    const [allVendors, setAllVendors] = useState<any[]>([]);

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const res = await api.get("/system-fields/");
                setSystemFields(res.data);
            } catch (error) {
                console.error("Failed to fetch system fields", error);
            }
        };

        const fetchVendors = async () => {
            try {
                const res = await api.get("/vendors/");
                setAllVendors(res.data);
            } catch (error) {
                console.error("Failed to fetch vendors", error);
            }
        };

        if (open) {
            fetchFields();
            fetchVendors();
        }
    }, [open]);

    const mode = campaignId ? "edit" : "create";

    useEffect(() => {
        if (open) {
            if (campaignId) {
                fetchCampaignDetails(campaignId);
            } else {
                setForm(INITIAL_FORM_STATE);
            }
        }
    }, [open, campaignId]);

    const fetchCampaignDetails = async (id: string) => {
        try {
            setIsLoading(true);
            const res = await api.get(`/customers/${customerId}/campaigns/${id}`);
            const campaign = res.data;

            setForm({
                name: campaign.name,
                description: campaign.description || "",
                destination_id: campaign.destination_id,
                source_ids: campaign.source_ids || [],
                config: {
                    status: campaign.config.status || "enabled",
                    priority: campaign.config.priority || 0,
                    weight: campaign.config.weight || 100,
                    monday_cap: campaign.config.monday_cap,
                    tuesday_cap: campaign.config.tuesday_cap,
                    wednesday_cap: campaign.config.wednesday_cap,
                    thursday_cap: campaign.config.thursday_cap,
                    friday_cap: campaign.config.friday_cap,
                    saturday_cap: campaign.config.saturday_cap,
                    sunday_cap: campaign.config.sunday_cap,
                    all_day: campaign.config.all_day ?? true,
                    start_time: campaign.config.start_time || "00:00",
                    end_time: campaign.config.end_time || "23:59",
                    campaign_max: campaign.config.campaign_max,
                    hourly_cap: campaign.config.hourly_cap,
                    allow_duplicates: campaign.config.allow_duplicates || "always",
                    send_failed_to: campaign.config.send_failed_to,
                },
                mapping: {
                    rules: campaign.mapping?.rules || [],
                },
                rules: {
                    filtering: campaign.rules?.filtering || { logic: "and", conditions: [] },
                },
            });
        } catch (error) {
            console.error("Failed to fetch campaign details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.destination_id) return;
        try {
            setIsSaving(true);
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                destination_id: form.destination_id,
                source_ids: form.source_ids,
                config: form.config, // Form state now perfectly matches model
                mapping: form.mapping,
                rules: form.rules,
            };

            if (mode === "edit" && campaignId) {
                await api.put(`/customers/${customerId}/campaigns/${campaignId}`, payload);
            } else {
                await api.post(`/customers/${customerId}/campaigns`, payload);
            }

            onSuccess();
        } catch (error) {
            console.error("Failed to save campaign", error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateForm = (updater: (prev: CampaignFormState) => CampaignFormState) => {
        setForm(updater(form));
    };

    const toggleSource = (sourceId: string) => {
        updateForm(p => {
            const current = p.source_ids || [];
            if (current.includes(sourceId)) {
                return { ...p, source_ids: current.filter(id => id !== sourceId) };
            } else {
                return { ...p, source_ids: [...current, sourceId] };
            }
        });
    };

    const getSourceLabel = (sourceId: string) => {
        for (const v of allVendors) {
            const s = v.sources.find((src: any) => src.id === sourceId);
            if (s) return `${v.name} - ${s.name}`;
        }
        return sourceId;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] w-[95vw]">
                <DialogHeader>
                    <DialogTitle>{mode === "edit" ? "Edit Campaign" : "Add Campaign"}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">Loading campaign details...</div>
                ) : (
                    <div className="space-y-6 py-4 max-h-[75vh] overflow-auto pr-2">
                        {/* Basic Info */}
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="campaignName">Campaign Name</Label>
                                <Input
                                    id="campaignName"
                                    value={form.name}
                                    onChange={(e) => updateForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Primary Email Delivery"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={form.description}
                                    onChange={(e) => updateForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief explanation of this campaign's purpose..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Destination Selection */}
                            <div className="grid gap-2">
                                <Label>Target Destination</Label>
                                <Select
                                    value={form.destination_id}
                                    onValueChange={(val) => updateForm(p => ({ ...p, destination_id: val }))}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select an endpoint..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {destinations.map((d, index) => (
                                            <SelectItem
                                                key={d.id || d._id || index}
                                                value={d.id || d._id}
                                                disabled={d.approval_status === "pending" || d.approval_status === "rejected"}
                                            >
                                                <div className="flex items-center w-full justify-between gap-2">
                                                    <span>{d.name}</span>
                                                    {d.approval_status === "pending" && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                                            Pending Approval
                                                        </Badge>
                                                    )}
                                                    {d.approval_status === "rejected" && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-700 border-red-200">
                                                            Rejected
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Source Selection - Multi-select mockup with Popover */}
                            <div className="grid gap-2">
                                <Label>Allowed Sources</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal bg-white">
                                            <span className="truncate">
                                                {form.source_ids.length === 0
                                                    ? "Allow All Sources"
                                                    : `${form.source_ids.length} selected`}
                                            </span>
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <div className="p-2 border-b bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                            Select Vendors & Sources
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-4">
                                            {allVendors.map((vendor) => (
                                                <div key={vendor.id} className="space-y-1">
                                                    <div className="px-2 py-1 text-xs font-semibold text-slate-900 bg-slate-100 rounded">
                                                        {vendor.name}
                                                    </div>
                                                    <div className="pl-4 space-y-1 mt-1">
                                                        {vendor.sources.map((source: any) => (
                                                            <div
                                                                key={source.id}
                                                                className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded group cursor-pointer"
                                                                onClick={() => toggleSource(source.id)}
                                                            >
                                                                <div className={cn(
                                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                                    form.source_ids.includes(source.id)
                                                                        ? "bg-blue-600 border-blue-600 outline-none"
                                                                        : "bg-white border-slate-300"
                                                                )}>
                                                                    {form.source_ids.includes(source.id) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <span className="text-xs text-slate-700">{source.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {allVendors.length === 0 && (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    No vendors found.
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t bg-muted/30 flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 h-7 text-[10px] bg-white"
                                                onClick={() => {
                                                    const allSourceIds = allVendors.flatMap(v => v.sources.map((s: any) => s.id));
                                                    updateForm(p => ({ ...p, source_ids: allSourceIds }));
                                                }}
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 h-7 text-[10px]"
                                                onClick={() => updateForm(p => ({ ...p, source_ids: [] }))}
                                            >
                                                Clear (Allow All)
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <p className="text-[10px] text-muted-foreground">Leave empty to accept all sources.</p>
                            </div>
                        </div>

                        {/* Config: Status, Priority, Weight */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-md border">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.config.status === "enabled"}
                                        onCheckedChange={(checked) =>
                                            updateForm(p => ({ ...p, config: { ...p.config, status: checked ? "enabled" : "disabled" } }))
                                        }
                                    />
                                    <Badge variant={form.config.status === "enabled" ? "default" : "secondary"}>
                                        {form.config.status === "enabled" ? "Active" : "Paused"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Input
                                    type="number"
                                    className="bg-white"
                                    value={form.config.priority}
                                    onChange={(e) => updateForm(p => ({ ...p, config: { ...p.config, priority: parseInt(e.target.value) || 0 } }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Weight (%)</Label>
                                <Input
                                    type="number"
                                    className="bg-white"
                                    min="0"
                                    max="100"
                                    value={form.config.weight}
                                    onChange={(e) => updateForm(p => ({ ...p, config: { ...p.config, weight: parseInt(e.target.value) || 100 } }))}
                                />
                            </div>
                        </div>

                        {/* Capping & Scheduling */}
                        <div className="border-t pt-4 space-y-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-orange-600" />
                                <div className="text-sm font-semibold">Capping & Scheduling</div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                                {[
                                    { day: "monday", label: "Monday" },
                                    { day: "tuesday", label: "Tuesday" },
                                    { day: "wednesday", label: "Wednesday" },
                                    { day: "thursday", label: "Thursday" },
                                    { day: "friday", label: "Friday" },
                                    { day: "saturday", label: "Saturday" },
                                    { day: "sunday", label: "Sunday" },
                                ].map(({ day, label }) => (
                                    <div key={day} className="flex items-center justify-between gap-4">
                                        <Label className="text-xs text-muted-foreground w-20">{label}</Label>
                                        <Input
                                            type="number"
                                            className="h-8 bg-white w-32"
                                            value={(form.config as any)[`${day}_cap`] ?? ""}
                                            onChange={(e) => updateForm(p => ({
                                                ...p,
                                                config: { ...p.config, [`${day}_cap`]: e.target.value === "" ? undefined : parseInt(e.target.value) }
                                            }))}
                                        />
                                    </div>
                                ))}

                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground w-20">Start Time</Label>
                                    <Input
                                        type="time"
                                        className="h-8 bg-white w-32"
                                        value={form.config.start_time}
                                        onChange={(e) => updateForm(p => ({ ...p, config: { ...p.config, start_time: e.target.value } }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground w-20">End Time</Label>
                                    <Input
                                        type="time"
                                        className="h-8 bg-white w-32"
                                        value={form.config.end_time}
                                        onChange={(e) => updateForm(p => ({ ...p, config: { ...p.config, end_time: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-2 py-2">
                                <Switch
                                    id="all_day"
                                    checked={form.config.all_day}
                                    onCheckedChange={(checked) => updateForm(p => ({ ...p, config: { ...p.config, all_day: checked } }))}
                                />
                                <Label htmlFor="all_day" className="text-xs cursor-pointer">All day leads?</Label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 px-2 mt-4">
                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground">Campaign Max</Label>
                                    <Input
                                        type="number"
                                        className="h-8 bg-white w-[60%]"
                                        value={form.config.campaign_max ?? ""}
                                        onChange={(e) => updateForm(p => ({
                                            ...p,
                                            config: { ...p.config, campaign_max: e.target.value === "" ? undefined : parseInt(e.target.value) }
                                        }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground">Send Failed Leads To</Label>
                                    <Select
                                        value={form.config.send_failed_to || ""}
                                        onValueChange={(val) => updateForm(p => ({ ...p, config: { ...p.config, send_failed_to: val } }))}
                                    >
                                        <SelectTrigger className="h-8 bg-white w-[60%] text-xs">
                                            <SelectValue placeholder="Select Destination..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {destinations.map((d, index) => (
                                                <SelectItem key={d.id || d._id || index} value={d.id || d._id}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground">Allow Duplicate Leads</Label>
                                    <Select
                                        value={form.config.allow_duplicates}
                                        onValueChange={(val: any) => updateForm(p => ({ ...p, config: { ...p.config, allow_duplicates: val } }))}
                                    >
                                        <SelectTrigger className="h-8 bg-white w-[60%] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="always">Always</SelectItem>
                                            <SelectItem value="never">Never</SelectItem>
                                            <SelectItem value="daily">Once Per Day</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <Label className="text-xs text-muted-foreground">Hourly Assignment Cap</Label>
                                    <Input
                                        type="number"
                                        className="h-8 bg-white w-[60%]"
                                        value={form.config.hourly_cap ?? ""}
                                        onChange={(e) => updateForm(p => ({
                                            ...p,
                                            config: { ...p.config, hourly_cap: e.target.value === "" ? undefined : parseInt(e.target.value) }
                                        }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filtering Rules */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="w-4 h-4 text-purple-600" />
                                <div className="text-sm font-semibold">Eligibility Rules (Payload)</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-md border">
                                <p className="text-xs text-muted-foreground mb-4">
                                    Check lead data values (e.g. state = "CA") to determine eligibility.
                                </p>
                                <RuleBuilder
                                    rule={form.rules.filtering}
                                    onChange={(newRule) => updateForm(p => ({ ...p, rules: { ...p.rules, filtering: newRule } }))}
                                    systemFields={systemFields}
                                />
                            </div>
                        </div>


                        {/* Outbound Mapping */}
                        <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 text-blue-600" />
                                <div className="text-sm font-semibold">Outbound Field Mapping</div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                                Map internal fields to destination fields, or add static custom fields with hardcoded values.
                            </p>
                            <div className="space-y-3">
                                {form.mapping.rules.map((rule, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex gap-2 items-start p-3 rounded-md border transition-colors",
                                            rule.is_static ? "bg-amber-50 border-amber-200" : "bg-white"
                                        )}
                                    >
                                        <div className="flex-1 space-y-2">
                                            {/* Toggle Button */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Button
                                                    type="button"
                                                    variant={rule.is_static ? "secondary" : "default"}
                                                    size="sm"
                                                    className="h-6 text-[10px] px-2"
                                                    onClick={() => {
                                                        const newRules = [...form.mapping.rules];
                                                        newRules[idx].is_static = !newRules[idx].is_static;
                                                        // Clear source_field when switching to static
                                                        if (newRules[idx].is_static) {
                                                            newRules[idx].source_field = "";
                                                        }
                                                        updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                    }}
                                                >
                                                    {rule.is_static ? (
                                                        <>
                                                            <Zap className="w-3 h-3 mr-1" />
                                                            Static Value
                                                        </>
                                                    ) : (
                                                        "System Field"
                                                    )}
                                                </Button>
                                                {rule.is_static && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 text-amber-700 border-amber-300">
                                                        Hardcoded
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Conditional Fields */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {!rule.is_static ? (
                                                    <>
                                                        {/* System Field Mode */}
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-muted-foreground">Internal Field</Label>
                                                            <Select
                                                                value={rule.source_field}
                                                                onValueChange={(val) => {
                                                                    const newRules = [...form.mapping.rules];
                                                                    newRules[idx].source_field = val;
                                                                    // Default target to source if empty
                                                                    if (!newRules[idx].target_field) newRules[idx].target_field = val;
                                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs w-full bg-white">
                                                                    <SelectValue placeholder="Select Field" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {systemFields.map((sf) => (
                                                                        <SelectItem key={sf.field_key} value={sf.field_key}>
                                                                            {sf.label} ({sf.field_key})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-muted-foreground">Destination Field</Label>
                                                            <Input
                                                                placeholder="e.g. EmailAddress"
                                                                className="h-8 px-2 text-xs bg-white"
                                                                value={rule.target_field || ""}
                                                                onChange={(e) => {
                                                                    const newRules = [...form.mapping.rules];
                                                                    newRules[idx].target_field = e.target.value;
                                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                                }}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Static Field Mode */}
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-muted-foreground">Custom Field Name</Label>
                                                            <Input
                                                                placeholder="e.g. campaign_source"
                                                                className="h-8 px-2 text-xs bg-white"
                                                                value={rule.target_field || ""}
                                                                onChange={(e) => {
                                                                    const newRules = [...form.mapping.rules];
                                                                    newRules[idx].target_field = e.target.value;
                                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] text-muted-foreground">Static Value</Label>
                                                            <Input
                                                                placeholder="e.g. premium_leads"
                                                                className="h-8 px-2 text-xs bg-white"
                                                                value={rule.default_value || ""}
                                                                onChange={(e) => {
                                                                    const newRules = [...form.mapping.rules];
                                                                    newRules[idx].default_value = e.target.value;
                                                                    updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                                                }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive h-8 w-8 shrink-0 mt-6"
                                            onClick={() => {
                                                const newRules = form.mapping.rules.filter((_, i) => i !== idx);
                                                updateForm(p => ({ ...p, mapping: { rules: newRules } }));
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {/* Add Buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-dashed bg-white"
                                        onClick={() =>
                                            updateForm(p => ({
                                                ...p,
                                                mapping: { rules: [...p.mapping.rules, { source_field: "", target_field: "", is_static: false }] },
                                            }))
                                        }
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Field Mapping
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-dashed bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                                        onClick={() =>
                                            updateForm(p => ({
                                                ...p,
                                                mapping: { rules: [...p.mapping.rules, { source_field: "", target_field: "", default_value: "", is_static: true }] },
                                            }))
                                        }
                                    >
                                        <Zap className="h-4 w-4 mr-2" /> Add Static Field
                                    </Button>
                                </div>
                            </div>
                        </div>


                        <Button onClick={handleSave} className="w-full py-6" disabled={isSaving || !form.destination_id}>
                            {isSaving ? "Saving..." : "Save Campaign"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
