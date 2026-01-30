"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import ApproveDestinationDialog from "@/components/customers/approve-destination-dialog"
import RejectDestinationDialog from "@/components/customers/reject-destination-dialog"
import { useAuth } from "@/context/auth-context"
import { Permission } from "@/lib/permissions"

interface PendingDestination {
    id: string
    name: string
    type: string
    url: string
    customer_id: string
    customer_name: string
    requested_by: string
    requested_by_email: string | null
    created_at: string | null
}

export default function ApprovalsPage() {
    const [destinations, setDestinations] = useState<PendingDestination[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDestination, setSelectedDestination] = useState<PendingDestination | null>(null)
    const [approveDialogOpen, setApproveDialogOpen] = useState(false)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

    const { user } = useAuth();
    const isOwner = user?.role === "owner";
    const canApprove = isOwner || user?.permissions?.includes(Permission.APPROVE_DESTINATIONS);

    useEffect(() => {
        fetchPendingDestinations()
    }, [])

    const fetchPendingDestinations = async () => {
        try {
            const res = await api.get("/customers/destinations/pending")
            setDestinations(res.data)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to load pending destinations")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = (destination: PendingDestination) => {
        setSelectedDestination(destination)
        setApproveDialogOpen(true)
    }

    const handleReject = (destination: PendingDestination) => {
        setSelectedDestination(destination)
        setRejectDialogOpen(true)
    }

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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Destination Approvals</h1>
                    <p className="text-muted-foreground mt-1">Manage and review destination endpoints requiring verification.</p>
                </div>
                {destinations.length > 0 && (
                    <Badge variant="secondary" className="w-fit h-7 px-3 text-xs font-semibold bg-yellow-100 text-yellow-800 border-yellow-200">
                        {destinations.length} pending review
                    </Badge>
                )}
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="relative overflow-hidden border-none bg-slate-900 text-white shadow-xl">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-yellow-400" />
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Queue Status</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-4xl font-extrabold">{destinations.length}</span>
                            <span className="text-slate-400 text-sm font-medium">Pending Approvals</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                            Awaiting verification from system administrators.
                        </p>
                    </CardContent>
                    <div className="absolute -right-6 -bottom-6 opacity-10">
                        <Clock className="w-32 h-32" />
                    </div>
                </Card>

                <Card className="border-slate-100 bg-blue-50/50 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2 text-blue-700">
                            <CheckCircle className="w-5 h-5" />
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Quick Actions</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Review and authorize new destinations. Approved endpoints are
                            immediately available for campaign distribution.
                        </p>
                        <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
                            <span>Verification Required</span>
                            <span className="mx-2">•</span>
                            <span>Standard Protocol</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 bg-indigo-50/50 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2 text-indigo-700">
                            <XCircle className="w-5 h-5" />
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-700">Security Gate</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Safeguard lead delivery by ensuring only validated endpoints receive data.
                            Unauthorized destinations are automatically blocked.
                        </p>
                        <div className="mt-4 flex items-center text-xs font-medium text-indigo-600">
                            <span>Zero Trust Policy</span>
                            <span className="mx-2">•</span>
                            <span>Active Protection</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Destinations Table */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Review Queue</CardTitle>
                            <CardDescription>
                                Destinations awaiting administrative authorization
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchPendingDestinations}
                            className="text-slate-500 hover:text-slate-900"
                        >
                            Refresh List
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {destinations.length === 0 ? (
                        <div className="text-center py-20 bg-white">
                            <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-500">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">System Optimized</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                All destination requests have been processed. There are no pending items in the queue.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-900">Endpoint Name</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Protocol</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Target Address</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Entity</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Originator</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-900">Verification</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {destinations.map((dest, index) => (
                                        <TableRow key={dest.id || (dest as any)._id || index} className="group hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="font-bold text-slate-900">{dest.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{dest.id}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize text-[10px] font-bold px-2 py-0">
                                                    {dest.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-xs text-slate-600 bg-slate-100/50 px-2 py-1 rounded-md w-fit border border-slate-200/50">
                                                    <ExternalLink className="w-3 h-3 mr-1.5 text-slate-400" />
                                                    <span className="truncate max-w-xs">{dest.url}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-700">{dest.customer_name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-600 font-medium">
                                                    {dest.requested_by_email || "System User"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100">
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all"
                                                        onClick={() => handleApprove(dest)}
                                                        disabled={!canApprove}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
                                                        onClick={() => handleReject(dest)}
                                                        disabled={!canApprove}
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            {selectedDestination && (
                <>
                    <ApproveDestinationDialog
                        open={approveDialogOpen}
                        onOpenChange={setApproveDialogOpen}
                        destination={selectedDestination}
                        onSuccess={() => {
                            setApproveDialogOpen(false)
                            fetchPendingDestinations()
                        }}
                    />
                    <RejectDestinationDialog
                        open={rejectDialogOpen}
                        onOpenChange={setRejectDialogOpen}
                        destination={selectedDestination}
                        onSuccess={() => {
                            setRejectDialogOpen(false)
                            fetchPendingDestinations()
                        }}
                    />
                </>
            )}
        </div>
    )
}
