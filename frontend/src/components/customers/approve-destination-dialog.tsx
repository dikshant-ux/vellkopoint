"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import api from "@/lib/api"
import { Loader2, CheckCircle, ExternalLink } from "lucide-react"

interface PendingDestination {
    id: string
    _id?: string
    name: string
    type: string
    url: string
    customer_id: string
    customer_name: string
    requested_by: string
    requested_by_email: string | null
}

interface ApproveDestinationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    destination: PendingDestination
    onSuccess: () => void
}

export default function ApproveDestinationDialog({
    open,
    onOpenChange,
    destination,
    onSuccess,
}: ApproveDestinationDialogProps) {
    const [loading, setLoading] = useState(false)

    const handleApprove = async () => {
        setLoading(true)

        try {
            await api.post(`/customers/destinations/${destination.id || destination._id}/approve`)

            toast.success("Destination approved!", {
                description: `${destination.name} is now active and can be used for lead delivery.`,
            })

            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to approve destination")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        Approve Destination
                    </DialogTitle>
                    <DialogDescription>
                        Review the destination details before approving.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Destination Details */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Destination Name</div>
                            <div className="font-medium">{destination.name}</div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Type</div>
                            <div className="font-medium capitalize">{destination.type}</div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">URL</div>
                            <div className="flex items-center text-sm">
                                <ExternalLink className="w-3 h-3 mr-1 text-gray-400" />
                                <a
                                    href={destination.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                >
                                    {destination.url}
                                </a>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Customer</div>
                            <div className="font-medium">{destination.customer_name}</div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Requested By</div>
                            <div className="text-sm">{destination.requested_by_email || "Unknown"}</div>
                        </div>
                    </div>

                    {/* Confirmation Message */}
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                            <strong>Approving this destination will:</strong>
                        </p>
                        <ul className="text-sm text-green-700 mt-2 ml-4 list-disc space-y-1">
                            <li>Make it available for campaign delivery</li>
                            <li>Send a confirmation email to the requester</li>
                            <li>Allow leads to be sent to this endpoint</li>
                        </ul>
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
                    <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Approve Destination
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
