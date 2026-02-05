"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Wand2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";

interface MappingRule {
    source_field: string;
    target_field: string | null;
}

interface SmartMappingSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (rules: MappingRule[], unmappedFields: string[]) => void;
}

// SYSTEM_FIELDS removed in favor of dynamic fetch

export function SmartMappingSheet({ isOpen, onClose, onApply }: SmartMappingSheetProps) {
    const [sampleJson, setSampleJson] = useState("");
    const [suggestions, setSuggestions] = useState<{ source_field: string; target_field: string | null; selected: boolean }[]>([]);
    const [error, setError] = useState("");
    const [systemFields, setSystemFields] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchSystemFields();
        }
    }, [isOpen]);

    const fetchSystemFields = async () => {
        try {
            const res = await api.get("/system-fields/");
            setSystemFields(res.data);
        } catch (error) {
            console.error("Failed to fetch system fields", error);
        }
    };

    const handleAutoDetect = () => {
        try {
            setError("");
            const parsed = JSON.parse(sampleJson);
            const flatObj = parsed && typeof parsed === 'object' ? (Array.isArray(parsed) ? parsed[0] : parsed) : {};

            if (!flatObj || typeof flatObj !== 'object') {
                setError("Please provide a valid JSON object or array.");
                return;
            }

            const newSuggestions: typeof suggestions = [];

            Object.keys(flatObj).forEach(key => {
                const normalize = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
                const normKey = normalize(key);

                const matchedField = systemFields.find(sf => {
                    const sfKeyNorm = normalize(sf.field_key);
                    const sfLabelNorm = normalize(sf.label);

                    if (normKey === sfKeyNorm || normKey === sfLabelNorm) return true;

                    return (sf.aliases || []).some((a: any) => {
                        const aliasNorm = typeof a === 'string' ? normalize(a) : a.alias_normalized;
                        return normKey === aliasNorm;
                    });
                });

                if (matchedField) {
                    newSuggestions.push({
                        source_field: key,
                        target_field: matchedField.field_key,
                        selected: true,
                    });
                } else {
                    // Default to mapping to self if no match found, but unselected? 
                    // Or maybe try to match common aliases (would need aliases in SystemField model eventually)
                    // For now, let's suggest mapping to a field if exact match, otherwise leave empty target or guess

                    // Requirement: "Auto-detect"
                    // Let's just create a suggestion with empty target if no match
                    newSuggestions.push({
                        source_field: key,
                        target_field: null,
                        selected: false,
                    });
                }
            });

            // Filter out empty targets from "selected" by default if we want strictness, 
            // but let's select those with matches.
            // Let's include everything, even if target is null, so user can see what will be added
            setSuggestions(newSuggestions);
        } catch (e) {
            setError("Invalid JSON format. Please check your data.");
        }
    };

    const toggleSuggestion = (idx: number) => {
        setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
    };

    const updateTarget = (idx: number, val: string) => {
        setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, target_field: val } : s));
    };

    const handleApply = () => {
        const rules = suggestions
            .filter(s => s.selected && s.target_field)
            .map(s => ({ source_field: s.source_field, target_field: s.target_field })); // Ensure target_field is not null 

        // Identify unmapped fields:
        // 1. Not selected
        // 2. Selected but target is empty/null
        const unmappedFields = suggestions
            .filter(s => !s.selected || !s.target_field)
            .map(s => s.source_field);

        onApply(rules as MappingRule[], unmappedFields);
        onClose();
        setSampleJson("");
        setSuggestions([]);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                        <Wand2 className="w-6 h-6 text-purple-600" />
                        Smart Field Mapping
                    </SheetTitle>
                    <SheetDescription>
                        Paste a sample JSON payload from your vendor below. We'll examine the structure and automatically suggest mapping rules for common fields.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6 px-4">
                    <div className="space-y-3">
                        <Label className="font-semibold text-foreground/80">Sample JSON Payload</Label>
                        <div className="relative rounded-lg overflow-hidden border bg-zinc-950 shadow-inner">
                            <div className="flex items-center px-4 py-2 bg-zinc-900 border-b border-white/10 text-[10px] font-mono text-zinc-400">
                                <span>input.json</span>
                            </div>
                            <Textarea
                                placeholder='{
  "first_name": "John",
  "email_address": "john@doe.com",
  "phone": "555-0123"
}'
                                className="font-mono text-xs min-h-[200px] border-none bg-transparent text-zinc-300 placeholder:text-zinc-600 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                value={sampleJson}
                                onChange={(e) => setSampleJson(e.target.value)}
                                spellCheck={false}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 animate-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <Button
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all duration-300 group"
                            size="lg"
                            onClick={handleAutoDetect}
                            disabled={!sampleJson.trim()}
                        >
                            <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                            Auto-Detect Fields
                        </Button>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Proposed Mappings</Label>
                                <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{suggestions.filter(s => s.selected).length} selected</Badge>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm bg-card/50">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead className="text-xs font-semibold">Source Key</TableHead>
                                            <TableHead className="w-[30px]"></TableHead>
                                            <TableHead className="text-xs font-semibold">Target Field</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suggestions.map((s, idx) => (
                                            <TableRow key={idx} className="group transition-colors hover:bg-muted/30">
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        className="translate-y-0.5 w-4 h-4 accent-purple-600 cursor-pointer"
                                                        checked={s.selected}
                                                        onChange={() => toggleSuggestion(idx)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-[11px] px-2 py-1 rounded bg-muted/80 inline-block text-foreground/80 border">
                                                        {s.source_field}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={s.target_field || ""}
                                                        onValueChange={(val) => updateTarget(idx, val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-full border-input bg-background/50 text-xs px-2">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {systemFields.map(sf => (
                                                                <SelectItem key={sf.field_key} value={sf.field_key} className="text-xs">
                                                                    {sf.label} ({sf.field_key})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter>
                    <Button
                        className="w-full"
                        onClick={handleApply}
                        disabled={suggestions.filter(s => s.selected).length === 0}
                    >
                        Apply Mappings
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
