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
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import { Loader2, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

interface SystemField {
    _id: string;
    field_key: string;
    label: string;
    data_type: string;
    category: string;
    is_required: boolean;
    description?: string;
    aliases: {
        alias_raw: string;
        alias_normalized: string;
        scope: string;
        confidence: string;
        vendor_id?: string;
        source_id?: string;
    }[];
}

interface SystemFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: SystemField | null;
    onSuccess: () => void;
}

export function SystemFieldDialog({ open, onOpenChange, field, onSuccess }: SystemFieldDialogProps) {
    const isEdit = !!field;
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [fieldKey, setFieldKey] = useState("");
    const [label, setLabel] = useState("");
    const [dataType, setDataType] = useState("string");
    const [category, setCategory] = useState("general");
    const [isRequired, setIsRequired] = useState(false);
    const [description, setDescription] = useState("");
    const [aliases, setAliases] = useState<string[]>([]);
    const [newAlias, setNewAlias] = useState("");



    useEffect(() => {
        if (field) {
            setFieldKey(field.field_key);
            setLabel(field.label);
            setDataType(field.data_type);
            setCategory(field.category || "general");
            setIsRequired(field.is_required);
            setDescription(field.description || "");
            // Extract raw strings for the UI tags
            setAliases((field.aliases || []).map(a => typeof a === 'string' ? a : a.alias_raw));
        } else {
            // Reset for create
            setFieldKey("");
            setLabel("");
            setDataType("string");
            setCategory("general");
            setIsRequired(false);
            setDescription("");
            setAliases([]);
        }
    }, [field, open]);

    // Auto-generate key from label if creating and key is empty/untouched
    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLabel = e.target.value;
        setLabel(newLabel);
        if (!isEdit && !fieldKey) {
            setFieldKey(newLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
        }
    };

    const addAlias = () => {
        if (!newAlias.trim()) return;
        if (aliases.includes(newAlias.trim())) {
            toast.error("Alias already exists");
            return;
        }
        setAliases([...aliases, newAlias.trim()]);
        setNewAlias("");
    };

    const removeAlias = (aliasToRemove: string) => {
        setAliases(aliases.filter(a => a !== aliasToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                field_key: fieldKey,
                label,
                data_type: dataType,
                category,
                is_required: isRequired,
                description,
                // Convert simple strings back to structured objects for backend
                aliases: aliases.map(a => ({
                    alias_raw: a,
                    alias_normalized: a.toLowerCase().trim().replace(/[^a-z0-9]/g, ""),
                    scope: "global",
                    confidence: "manual"
                })),
            };

            if (isEdit) {
                await api.put(`/system-fields/${field.field_key}`, payload);
            } else {
                await api.post("/system-fields/", payload);
            }

            toast.success(isEdit ? "Field updated" : "Field created");
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit System Field" : "Create System Field"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update the properties of this system field." : "Define a new standard field for your leads."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="label">Label</Label>
                            <Input id="label" value={label} onChange={handleLabelChange} placeholder="e.g. Monthly Income" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="key">Field Key</Label>
                            <Input
                                id="key"
                                value={fieldKey}
                                onChange={(e) => setFieldKey(e.target.value)}
                                placeholder="e.g. monthly_income"
                                required
                                disabled={isEdit} // Prevent changing key on edit as it's the ID
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data Type</Label>
                            <Select value={dataType} onValueChange={setDataType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="object">Object</SelectItem>
                                    <SelectItem value="array">Array</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Financial" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description of this field..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Universal Aliases</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newAlias}
                                onChange={(e) => setNewAlias(e.target.value)}
                                placeholder="Add alias (e.g. EMAIL, email_address)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAlias();
                                    }
                                }}
                            />
                            <Button type="button" variant="secondary" onClick={addAlias}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
                            {aliases.length === 0 && <span className="text-xs text-muted-foreground italic">No aliases defined.</span>}
                            {aliases.map((alias) => (
                                <Badge key={alias} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                    {alias}
                                    <button
                                        type="button"
                                        onClick={() => removeAlias(alias)}
                                        className="hover:bg-muted rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Any lead field matching these aliases will be automatically mapped to this system field.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="required" checked={isRequired} onCheckedChange={setIsRequired} />
                        <Label htmlFor="required">Required Field</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Create Field"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
