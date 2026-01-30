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
import { SystemFieldDialog } from "@/components/system/system-field-dialog";
import { Loader2, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

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

export function SystemFieldsTable() {
    const [fields, setFields] = useState<SystemField[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingField, setEditingField] = useState<SystemField | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { user } = useAuth();
    const isOwner = user?.role === "owner";
    const canCreate = isOwner || user?.permissions?.includes(Permission.CREATE_SYSTEM_FIELDS);
    const canEdit = isOwner || user?.permissions?.includes(Permission.EDIT_SYSTEM_FIELDS);
    const canDelete = isOwner || user?.permissions?.includes(Permission.DELETE_SYSTEM_FIELDS);

    const fetchFields = async () => {
        try {
            // Add cache-busting parameter to force fresh data
            const res = await api.get(`/system-fields/?_t=${Date.now()}`);
            setFields(res.data);
        } catch (error) {
            console.error("Failed to fetch fields", error);
            toast.error("Failed to load system fields");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const handleCreate = () => {
        setEditingField(null);
        setDialogOpen(true);
    };

    const handleEdit = (field: SystemField) => {
        setEditingField(field);
        setDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        const fieldToDelete = fields.find(f => f._id === deleteId);
        if (!fieldToDelete) return;

        try {
            await api.delete(`/system-fields/${fieldToDelete.field_key}`);
            toast.success("Field deleted");
            fetchFields();
        } catch (error) {
            toast.error("Failed to delete field");
        } finally {
            setDeleteId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                {canCreate && (
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Field
                    </Button>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Field Key</TableHead>
                            <TableHead>Label</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Aliased Keys</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No system fields defined.
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field) => (
                                <TableRow key={field._id}>
                                    <TableCell className="font-mono text-xs font-medium">{field.field_key}</TableCell>
                                    <TableCell>{field.label}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-normal">{field.data_type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {field.aliases?.length > 0 ? (
                                                field.aliases.map((aliasObj, idx) => (
                                                    <Badge key={`${field.field_key}-alias-${idx}`} variant="secondary" className="text-[10px] px-1 py-0 h-5 font-mono">
                                                        {aliasObj.alias_raw}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground capitalize">{field.category}</TableCell>
                                    <TableCell>
                                        {field.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(field)} disabled={!canEdit}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(field._id)} disabled={!canDelete}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SystemFieldDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                field={editingField}
                onSuccess={() => {
                    setDialogOpen(false);
                    fetchFields();
                }}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the system field definition.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
