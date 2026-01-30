"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Shield, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface RuleCondition {
    field: string;
    op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "nin" | "contains" | "regex";
    value: string;
}

export interface RuleGroup {
    logic: "and" | "or";
    conditions: (RuleCondition | RuleGroup)[];
}

interface RuleBuilderProps {
    rule: RuleGroup;
    onChange: (rule: RuleGroup) => void;
    depth?: number;
    onDelete?: () => void;
    systemFields?: any[];
}

export function RuleBuilder({
    rule,
    onChange,
    depth = 0,
    onDelete,
    systemFields = [],
}: RuleBuilderProps) {
    const isRoot = depth === 0;

    const updateLogic = (logic: "and" | "or") => {
        onChange({ ...rule, logic });
    };

    const addCondition = () => {
        onChange({
            ...rule,
            conditions: [...rule.conditions, { field: "", op: "eq", value: "" }],
        });
    };

    const addGroup = () => {
        onChange({
            ...rule,
            conditions: [
                ...rule.conditions,
                { logic: "and", conditions: [{ field: "", op: "eq", value: "" }] },
            ],
        });
    };

    const updateCondition = (index: number, condition: RuleCondition) => {
        const updated = [...rule.conditions];
        updated[index] = condition;
        onChange({ ...rule, conditions: updated });
    };

    const updateGroup = (index: number, group: RuleGroup) => {
        const updated = [...rule.conditions];
        updated[index] = group;
        onChange({ ...rule, conditions: updated });
    };

    const removeItem = (index: number) => {
        onChange({
            ...rule,
            conditions: rule.conditions.filter((_, i) => i !== index),
        });
    };

    return (
        <div
            className={cn(
                "flex flex-col gap-3 p-4 rounded-xl border bg-muted/20 shadow-sm",
                !isRoot && "ml-3 pl-3 border-l-2 border-primary/30"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs font-bold uppercase",
                        rule.logic === "and"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                    )}
                >
                    {rule.logic === "and" ? (
                        <Shield className="w-3 h-3" />
                    ) : (
                        <GitMerge className="w-3 h-3" />
                    )}
                    {rule.logic}
                </div>

                <div className="flex-1 h-px bg-border" />

                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] uppercase font-semibold"
                        onClick={() =>
                            updateLogic(rule.logic === "and" ? "or" : "and")
                        }
                    >
                        Switch to {rule.logic === "and" ? "OR" : "AND"}
                    </Button>

                    {!isRoot && onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Conditions */}
            <div className="flex flex-col gap-2">
                {rule.conditions.map((item, idx) => (
                    <div key={idx}>
                        {isRuleGroup(item) ? (
                            <RuleBuilder
                                rule={item}
                                depth={depth + 1}
                                onChange={(g) => updateGroup(idx, g)}
                                onDelete={() => removeItem(idx)}
                                systemFields={systemFields}
                            />
                        ) : (
                            <div className="group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_2fr_auto] gap-2 items-center bg-background p-2 rounded-md border">
                                {/* Field */}
                                <div className="w-full">
                                    <Select
                                        value={item.field}
                                        onValueChange={(val) =>
                                            updateCondition(idx, {
                                                ...item,
                                                field: val,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {systemFields.map((sf) => (
                                                <SelectItem
                                                    key={sf.field_key}
                                                    value={sf.field_key}
                                                    className="text-xs"
                                                >
                                                    {sf.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Operator */}
                                <div className="w-full">
                                    <Select
                                        value={item.op}
                                        onValueChange={(val: any) =>
                                            updateCondition(idx, {
                                                ...item,
                                                op: val,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="eq">Equals</SelectItem>
                                            <SelectItem value="neq">Not Equals</SelectItem>
                                            <SelectItem value="gt">Greater</SelectItem>
                                            <SelectItem value="lt">Less</SelectItem>
                                            <SelectItem value="contains">Contains</SelectItem>
                                            <SelectItem value="regex">Regex</SelectItem>
                                            <SelectItem value="in">In List</SelectItem>
                                            <SelectItem value="nin">Not In List</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Value */}
                                <Input
                                    placeholder="Value"
                                    className="h-9 text-sm w-full"
                                    value={item.value}
                                    onChange={(e) =>
                                        updateCondition(idx, {
                                            ...item,
                                            value: e.target.value,
                                        })
                                    }
                                />

                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeItem(idx)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}

                {rule.conditions.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded">
                        No conditions defined
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-dashed"
                    onClick={addCondition}
                >
                    <Plus className="w-3 h-3" /> Condition
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-dashed"
                    onClick={addGroup}
                >
                    <Plus className="w-3 h-3" /> Group
                </Button>
            </div>
        </div>
    );
}

function isRuleGroup(item: RuleCondition | RuleGroup): item is RuleGroup {
    return "logic" in item && "conditions" in item;
}
