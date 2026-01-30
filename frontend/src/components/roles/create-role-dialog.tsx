"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PERMISSION_LABELS } from "@/lib/permissions";

interface CreateRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    roleToEdit?: any; // If provided, we are in edit mode
}

export function CreateRoleDialog({ open, onOpenChange, onSuccess, roleToEdit }: CreateRoleDialogProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingPerms, setFetchingPerms] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [maskLeads, setMaskLeads] = useState(true); // Default to masked (secure)
    const [searchQuery, setSearchQuery] = useState("");

    // Available Permissions from API
    const [permissionGroups, setPermissionGroups] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (open) {
            fetchPermissions();
            if (roleToEdit) {
                setName(roleToEdit.name);
                setDescription(roleToEdit.description || "");
                setSelectedPermissions(roleToEdit.permissions || []);

                // Logic for Lead Masking
                // If "view_full_leads" is PRESENT -> NOT MASKED (maskLeads = false)
                // If "view_full_leads" is ABSENT -> MASKED (maskLeads = true)
                const hasFullAccess = roleToEdit.permissions?.includes("view_full_leads");
                setMaskLeads(!hasFullAccess);
            } else {
                resetForm();
            }
        }
    }, [open, roleToEdit]);

    const resetForm = () => {
        setName("");
        setDescription("");
        setSelectedPermissions([]);
        setMaskLeads(true); // Default secure
    };

    const fetchPermissions = async () => {
        setFetchingPerms(true);
        try {
            const res = await api.get("/permissions");
            setPermissionGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch permissions", error);
            toast.error("Failed to load permissions");
        } finally {
            setFetchingPerms(false);
        }
    };

    const handlePermissionToggle = (perm: string) => {
        setSelectedPermissions(prev => {
            if (prev.includes(perm)) {
                return prev.filter(p => p !== perm);
            } else {
                return [...prev, perm];
            }
        });
    };

    const handleGroupToggle = (groupName: string, permissions: string[]) => {
        const allSelected = permissions.every(p => selectedPermissions.includes(p));

        if (allSelected) {
            // Deselect all
            setSelectedPermissions(prev => prev.filter(p => !permissions.includes(p)));
        } else {
            // Select all
            const newPerms = [...selectedPermissions];
            permissions.forEach(p => {
                if (!newPerms.includes(p)) newPerms.push(p);
            });
            setSelectedPermissions(newPerms);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast.error("Role name is required");
            return;
        }

        setLoading(true);
        try {
            // Construct payload
            let finalPermissions = [...selectedPermissions];

            // Handle Lead Masking
            if (maskLeads) {
                // Ensure 'view_full_leads' is REMOVED
                finalPermissions = finalPermissions.filter(p => p !== "view_full_leads");
            } else {
                // Ensure 'view_full_leads' is ADDED
                if (!finalPermissions.includes("view_full_leads")) {
                    finalPermissions.push("view_full_leads");
                }
            }

            const payload = {
                name,
                description,
                permissions: finalPermissions
            };

            if (roleToEdit) {
                await api.put(`/roles/${roleToEdit.id}`, payload);
                toast.success("Role updated successfully");
            } else {
                await api.post("/roles", payload);
                toast.success("Role created successfully");
            }

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to save role", error);
            const msg = error.response?.data?.detail || "Failed to save role";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{roleToEdit ? "Edit Role" : "Create New Role"}</DialogTitle>
                    <DialogDescription>
                        Define the role name and configure granular permissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    <form id="role-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Role Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Lead Analyst"
                                    disabled={roleToEdit?.is_system}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Lead Masking</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Hide sensitive lead data (phone, email) for this role.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className={maskLeads ? "font-bold text-primary" : "text-muted-foreground"}>Masked</Label>
                                    <Switch
                                        checked={!maskLeads}
                                        onCheckedChange={(checked) => setMaskLeads(!checked)}
                                    />
                                    <Label className={!maskLeads ? "font-bold text-red-600" : "text-muted-foreground"}>Unmasked</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Permissions</Label>
                                <div className="relative w-64">
                                    <Input
                                        placeholder="Filter permissions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                            {fetchingPerms ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {Object.entries(permissionGroups).map(([group, perms]) => {
                                        // Filter out 'view_full_leads' from the generic list as it's handled by the switch
                                        const displayPerms = perms.filter(p => p !== "view_full_leads" && (
                                            p.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            group.toLowerCase().includes(searchQuery.toLowerCase())
                                        ));
                                        if (displayPerms.length === 0) return null;

                                        const allSelected = displayPerms.every(p => selectedPermissions.includes(p));
                                        const someSelected = displayPerms.some(p => selectedPermissions.includes(p));

                                        return (
                                            <div key={group} className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`group-${group}`}
                                                        checked={allSelected}
                                                        onCheckedChange={() => handleGroupToggle(group, displayPerms)}
                                                    />
                                                    <Label htmlFor={`group-${group}`} className="font-semibold text-sm cursor-pointer">
                                                        {group} Module
                                                    </Label>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2 pl-6">
                                                    {displayPerms.map((perm) => (
                                                        <div key={perm} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={perm}
                                                                checked={selectedPermissions.includes(perm)}
                                                                onCheckedChange={() => handlePermissionToggle(perm)}
                                                            />
                                                            <Label htmlFor={perm} className="text-sm font-normal cursor-pointer text-slate-600">
                                                                {PERMISSION_LABELS[perm]?.label || perm.split(":")[0]?.replace(/_/g, " ") || perm.split("_").join(" ")}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
                    <Button type="submit" form="role-form" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {roleToEdit ? "Save Changes" : "Create Role"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
