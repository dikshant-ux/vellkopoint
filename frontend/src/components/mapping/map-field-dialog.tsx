"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface MapFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: {
        source_id: string;
        field_name: string;
        sample_value: string;
    };
    onSuccess: () => void;
}

interface SystemField {
    field_key: string;
    label: string;
    data_type: string;
}

export function MapFieldDialog({ open, onOpenChange, field, onSuccess }: MapFieldDialogProps) {
    const [mode, setMode] = useState<"existing" | "new">("existing");
    const [systemFields, setSystemFields] = useState<SystemField[]>([]);
    const [selectedSystemField, setSelectedSystemField] = useState("");

    // New field state
    const [newFieldKey, setNewFieldKey] = useState("");
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldType, setNewFieldType] = useState("string");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingFields, setIsLoadingFields] = useState(false);

    useEffect(() => {
        if (open) {
            fetchSystemFields();
            // Pre-fill labels
            setNewFieldKey(field.field_name.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
            setNewFieldLabel(field.field_name.charAt(0).toUpperCase() + field.field_name.slice(1).replace(/_/g, " "));
        }
    }, [open, field]);

    const fetchSystemFields = async () => {
        setIsLoadingFields(true);
        try {
            const res = await api.get("/system-fields/");
            setSystemFields(res.data);
        } catch (error) {
            console.error("Failed to fetch system fields", error);
            toast.error("Failed to load system fields");
        } finally {
            setIsLoadingFields(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                source_id: field.source_id,
                vendor_field_name: field.field_name,
                target_system_field: mode === "existing" ? selectedSystemField : newFieldKey,
                is_new_system_field: mode === "new",
                new_field_data: mode === "new" ? {
                    label: newFieldLabel,
                    data_type: newFieldType,
                    field_key: newFieldKey
                } : null
            };

            await api.post("/unknown-fields/map", payload);

            toast.success("Field mapped successfully");
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Map Field "{field.field_name}"</DialogTitle>
                    <DialogDescription>
                        Map the vendor field <span className="font-mono text-xs bg-muted px-1 rounded">{field.field_name}</span> (Sample: {field.sample_value}) to a system field.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <RadioGroup
                        value={mode}
                        onValueChange={(v) => setMode(v as "existing" | "new")}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="existing" id="existing" className="peer sr-only" />
                            <Label
                                htmlFor="existing"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                Existing Field
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="new" id="new" className="peer sr-only" />
                            <Label
                                htmlFor="new"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                New Field
                            </Label>
                        </div>
                    </RadioGroup>

                    {mode === "existing" ? (
                        <div className="space-y-2">
                            <Label>Select System Field</Label>
                            <Select value={selectedSystemField} onValueChange={setSelectedSystemField}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingFields ? (
                                        <div className="p-2 text-center text-xs">Loading...</div>
                                    ) : (
                                        systemFields.map((sf) => (
                                            <SelectItem key={sf.field_key} value={sf.field_key}>
                                                {sf.label} <span className="text-muted-foreground ml-2 text-xs">({sf.field_key})</span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Field Key</Label>
                                <Input value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} placeholder="e.g. monthly_income" />
                            </div>
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="e.g. Monthly Income" />
                            </div>
                            <div className="space-y-2">
                                <Label>Data Type</Label>
                                <Select value={newFieldType} onValueChange={setNewFieldType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="string">String</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="boolean">Boolean</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (mode === "existing" && !selectedSystemField) || (mode === "new" && !newFieldKey)}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === "existing" ? "Map Field" : "Create & Map"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
