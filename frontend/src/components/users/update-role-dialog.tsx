"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import api from "@/lib/api"
import { Loader2, ShieldAlert } from "lucide-react"
import { ALL_FRONTEND_PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions"

interface User {
    id: string
    email: string
    full_name: string | null
    role: string
    role_id?: string
    permissions: string[]
    is_active: boolean
    is_verified: boolean
    invited_by: string | null
    created_at: string
}

interface Role {
    id: string
    name: string
    description: string
    is_system: boolean
}

interface UpdateRoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: User
    onSuccess: () => void
}

export default function UpdateRoleDialog({
    open,
    onOpenChange,
    user,
    onSuccess,
}: UpdateRoleDialogProps) {
    const [loading, setLoading] = useState(false)
    const [roles, setRoles] = useState<Role[]>([])
    // If user has a role_id, that is the value we want. otherwise their role string.
    const [selectedRoleValue, setSelectedRoleValue] = useState(user.role_id || user.role)

    useEffect(() => {
        if (open) {
            fetchRoles()
            // Reset state when opening for a new user
            setSelectedRoleValue(user.role_id || user.role)
        }
    }, [open, user])

    const fetchRoles = async () => {
        try {
            const res = await api.get("/roles")
            setRoles(res.data)
        } catch (error) {
            console.error("Failed to fetch roles", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Determine if selected value is a system role string or a role ID
        let role = "user"
        let role_id: string | undefined = undefined

        if (roles.find(r => r.id === selectedRoleValue)) {
            role_id = selectedRoleValue
            role = "user"
        } else {
            role = "user"
        }

        try {
            await api.put(`/users/${user.id}/role`, {
                role,
                role_id,
            })

            toast.success("User role updated!", {
                description: `${user.email} role has been updated.`,
            })

            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to update user role")
        } finally {
            setLoading(false)
        }
    }

    const hasChanged = (user.role_id || user.role) !== selectedRoleValue;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Update User Role</DialogTitle>
                    <DialogDescription>
                        Change the access level for <strong>{user.email}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-sm font-semibold">User Role</Label>
                            <Select value={selectedRoleValue} onValueChange={setSelectedRoleValue}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !hasChanged} className="min-w-[120px]">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {loading ? "Updating..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
