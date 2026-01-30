"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator
} from "@/components/ui/select"
import { toast } from "sonner"
import api from "@/lib/api"
import { Loader2 } from "lucide-react"

interface UserInviteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

interface Role {
    id: string
    name: string
    description: string
    is_system: boolean
}

export default function UserInviteDialog({
    open,
    onOpenChange,
    onSuccess,
}: UserInviteDialogProps) {
    const [loading, setLoading] = useState(false)
    const [roles, setRoles] = useState<Role[]>([])
    const [customRoleValue, setCustomRoleValue] = useState("")

    // Separate state for form data that maps to API payload
    const [formData, setFormData] = useState({
        email: "",
        full_name: "",
        role: "user",
        role_id: undefined as string | undefined
    })

    useEffect(() => {
        if (open) {
            fetchRoles()
        }
    }, [open])

    const fetchRoles = async () => {
        try {
            const res = await api.get("/roles")
            setRoles(res.data)
            // Set default to "User" role if found
            const userRole = res.data.find((r: Role) => r.name === "User")
            if (userRole) {
                setCustomRoleValue(userRole.id)
                setFormData(prev => ({ ...prev, role_id: userRole.id }))
            }
        } catch (error) {
            console.error("Failed to fetch roles", error)
        }
    }

    const handleRoleChange = (value: string) => {
        setCustomRoleValue(value)


        setFormData(prev => ({ ...prev, role: "user", role_id: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await api.post("/users/invite", {
                email: formData.email,
                full_name: formData.full_name,
                role: formData.role,
                role_id: formData.role_id,
            })

            toast.success("Invitation sent successfully!", {
                description: `An invitation email has been sent to ${formData.email}`,
            })

            // Reset form
            setFormData({
                email: "",
                full_name: "",
                role: "user",
                role_id: undefined
            })
            setCustomRoleValue("user")

            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to send invitation")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite User</DialogTitle>
                    <DialogDescription>
                        Send an invitation email to a new user. They will receive a link to set their password
                        and activate their account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name *</Label>
                            <Input
                                id="full_name"
                                type="text"
                                placeholder="John Doe"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={customRoleValue}
                                onValueChange={handleRoleChange}
                            >
                                <SelectTrigger>
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
                            {roles.find(r => r.id === customRoleValue)?.description}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
