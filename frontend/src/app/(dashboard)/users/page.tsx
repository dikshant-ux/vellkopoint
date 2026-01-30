"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPlus, MoreVertical, Search, Shield, ShieldCheck, User as UserIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import UserInviteDialog from "@/components/users/user-invite-dialog"
import UpdateRoleDialog from "@/components/users/update-role-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RolesTab } from "@/components/roles/roles-tab"
import { useAuth } from "@/context/auth-context"
import { Permission } from "@/lib/permissions"

interface User {
    id: string
    email: string
    full_name: string | null
    role: string
    permissions: string[]
    is_active: boolean
    is_verified: boolean
    invited_by: string | null
    created_at: string
}

export default function UsersPage() {
    const { user: currentUser } = useAuth()

    const isOwner = currentUser?.role === "owner";
    const canCreate = isOwner || currentUser?.permissions?.includes(Permission.INVITE_USERS);
    const canEdit = isOwner || currentUser?.permissions?.includes(Permission.MANAGE_USERS);
    // Note: We might want a specific permission for deactivation/reactivation if MANAGE_USERS is too broad, 
    // but typically MANAGE_USERS covers edit/status changes.
    const canDelete = isOwner || currentUser?.permissions?.includes(Permission.DELETE_USERS);
    const canViewUsers = isOwner || currentUser?.permissions?.includes(Permission.VIEW_USERS);
    const canViewRoles = isOwner || currentUser?.permissions?.includes(Permission.VIEW_ROLES);
    const canView = canViewUsers || canViewRoles;

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [updateRoleDialogOpen, setUpdateRoleDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    useEffect(() => {
        if (canView) {
            fetchUsers()
        }
    }, [canView])

    if (!canView) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 max-w-sm">
                        You do not have the required permissions to access User Management.
                        Please contact your administrator if you believe this is an error.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => window.location.href = "/"}
                    >
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    const fetchUsers = async () => {
        try {
            const res = await api.get("/users/")
            setUsers(res.data)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to load users")
        } finally {
            setLoading(false)
        }
    }

    const handleDeactivate = async (userId: string) => {
        if (!confirm("Are you sure you want to deactivate this user?")) return

        try {
            await api.delete(`/users/${userId}`)
            toast.success("User deactivated successfully")
            fetchUsers()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to deactivate user")
        }
    }

    const handleReactivate = async (userId: string) => {
        try {
            await api.post(`/users/${userId}/reactivate`)
            toast.success("User reactivated successfully")
            fetchUsers()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to reactivate user")
        }
    }

    const handlePermanentDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return

        try {
            await api.delete(`/users/${userId}/permanent`)
            toast.success("User permanently deleted")
            fetchUsers()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to delete user")
        }
    }

    const handleUpdateRole = (user: User) => {
        setSelectedUser(user)
        setUpdateRoleDialogOpen(true)
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "owner":
            case "super_admin":
                return (
                    <Badge className="bg-purple-500 hover:bg-purple-600">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {role === "owner" ? "Owner" : "Super Admin"}
                    </Badge>
                )
            case "admin":
                return (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                    </Badge>
                )
            case "user":
                return (
                    <Badge variant="secondary">
                        <UserIcon className="w-3 h-3 mr-1" />
                        User
                    </Badge>
                )
            default:
                return <Badge variant="outline">{role}</Badge>
        }
    }

    const filteredUsers = users.filter(
        (user) =>
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage users, roles, and permissions</p>
                </div>
            </div>

            <Tabs defaultValue={canViewUsers ? "users" : "roles"} className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" /> Users
                    </TabsTrigger>
                    {(currentUser?.role === "owner" || currentUser?.permissions?.includes(Permission.VIEW_ROLES)) && (
                        <TabsTrigger value="roles" className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Roles & Permissions
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="users">
                    {canViewUsers ? (
                        <>
                            <div className="flex justify-end mb-6">
                                {canCreate && (
                                    <Button onClick={() => setInviteDialogOpen(true)}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Invite User
                                    </Button>
                                )}
                            </div>

                            {/* Search */}
                            <div className="mb-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search users by email or name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    No users found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers.map((user, index) => (
                                                <TableRow key={user.id || (user as any)._id || index}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{user.full_name || "No name"}</div>
                                                            <div className="text-sm text-gray-500">{user.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                                    <TableCell>
                                                        {user.is_active ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleUpdateRole(user)} disabled={!canEdit}>
                                                                    Update Role
                                                                </DropdownMenuItem>
                                                                {user.is_active ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeactivate(user.id)}
                                                                        className="text-red-600"
                                                                        disabled={!canDelete}
                                                                    >
                                                                        Deactivate
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => handleReactivate(user.id)} disabled={!canDelete}>
                                                                        Reactivate
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={() => handlePermanentDelete(user.id)}
                                                                    className="text-red-700 font-medium focus:text-red-700"
                                                                    disabled={!canDelete}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete Permanently
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            You do not have permission to view users.
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="roles">
                    <RolesTab />
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <UserInviteDialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
                onSuccess={() => {
                    setInviteDialogOpen(false)
                    fetchUsers()
                }}
            />

            {selectedUser && (
                <UpdateRoleDialog
                    open={updateRoleDialogOpen}
                    onOpenChange={setUpdateRoleDialogOpen}
                    user={selectedUser}
                    onSuccess={() => {
                        setUpdateRoleDialogOpen(false)
                        fetchUsers()
                    }}
                />
            )}
        </div>
    )
}
