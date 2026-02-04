"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Users, Edit2, Trash2, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { CreateRoleDialog } from "./create-role-dialog";
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

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    is_system: boolean;
    user_count: number;
    created_at: string;
}

export function RolesTab() {
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<Role | undefined>(undefined);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await api.get("/roles/");
            setRoles(res.data);
        } catch (error) {
            console.error("Failed to fetch roles", error);
            toast.error("Failed to load roles");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (role: Role) => {
        setRoleToEdit(role);
        setIsCreateOpen(true);
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;

        try {
            await api.delete(`/roles/${roleToDelete.id}`);
            toast.success("Role deleted successfully");
            fetchRoles();
        } catch (error: any) {
            console.error("Failed to delete role", error);
            const msg = error.response?.data?.detail || "Failed to delete role";
            toast.error(msg);
        } finally {
            setRoleToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Role Management</CardTitle>
                        <CardDescription>
                            Create and manage custom roles to control user access.
                        </CardDescription>
                    </div>
                    <Button onClick={() => { setRoleToEdit(undefined); setIsCreateOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Create Role
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {roles.map((role) => (
                                <div
                                    key={role.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${role.is_system ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {role.is_system ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-sm">{role.name}</h4>
                                                {role.is_system && <Badge variant="secondary" className="text-[10px] h-5">System</Badge>}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{role.description || "No description provided."}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                    {role.permissions.length} Permissions
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                    {role.user_count} Users
                                                </Badge>
                                                {role.permissions.includes("view_full_leads") ? (
                                                    <Badge variant="destructive" className="text-[10px] font-normal bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                                                        Unmasked Leads
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="default" className="text-[10px] font-normal bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
                                                        Masked Leads
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                                            <Edit2 className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        {role.is_system ? (
                                            <Button variant="ghost" size="sm" disabled className="opacity-50">
                                                <Lock className="h-4 w-4 text-slate-300" />
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => setRoleToDelete(role)} disabled={role.user_count > 0}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <CreateRoleDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchRoles}
                roleToEdit={roleToEdit}
            />

            <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the role
                            <strong> {roleToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
