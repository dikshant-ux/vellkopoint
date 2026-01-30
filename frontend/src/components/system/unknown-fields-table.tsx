"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapFieldDialog } from "@/components/mapping/map-field-dialog";
import { Loader2, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

interface UnknownField {
    _id: string;
    source_id: string;
    field_name: string;
    sample_value: string;
    detected_count: number;
    status: string;
    first_seen: string;
    last_seen: string;
}

export function UnknownFieldsTable() {
    const { user } = useAuth();
    const canEdit = user?.role === "owner" || user?.permissions?.includes(Permission.EDIT_SYSTEM_FIELDS);

    const [fields, setFields] = useState<UnknownField[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedField, setSelectedField] = useState<UnknownField | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchFields = async () => {
        try {
            const res = await api.get("/unknown-fields/");
            setFields(res.data);
        } catch (error) {
            console.error("Failed to fetch fields", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const handleMapClick = (field: UnknownField) => {
        setSelectedField(field);
        setIsDialogOpen(true);
    };

    const handleMappingComplete = () => {
        setIsDialogOpen(false);
        fetchFields(); // Refresh list
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    if (fields.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No unknown fields detected.</div>;
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Field Name</TableHead>
                            <TableHead>Sample Value</TableHead>

                            <TableHead>Count</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field) => (
                            <TableRow key={field._id}>
                                <TableCell className="font-medium font-mono text-xs">{field.field_name}</TableCell>
                                <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">{field.sample_value}</TableCell>
                                <TableCell>{field.detected_count}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[10px] uppercase">{field.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleMapClick(field)}
                                        disabled={!canEdit}
                                        title={!canEdit ? "Requires 'Edit System Fields' permission" : ""}
                                    >
                                        Map <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {selectedField && (
                <MapFieldDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    field={selectedField}
                    onSuccess={handleMappingComplete}
                />
            )}
        </>
    );
}
