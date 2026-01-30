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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import api from "@/lib/api"
import { Loader2, XCircle, ExternalLink } from "lucide-react"

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

interface RejectDestinationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    destination: PendingDestination
    onSuccess: () => void
}

export default function RejectDestinationDialog({
    open,
    onOpenChange,
    destination,
    onSuccess,
}: RejectDestinationDialogProps) {
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState("")

    const handleReject = async () => {
        if (!reason.trim()) {
            toast.error("Please provide a reason for rejection")
            return
        }

        setLoading(true)

        try {
            await api.post(`/customers/destinations/${destination.id || destination._id}/reject`, {
                reason: reason.trim(),
            })

            toast.success("Destination rejected", {
                description: `${destination.name} has been rejected. The user will be notified.`,
            })

            setReason("")
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to reject destination")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        Reject Destination
                    </DialogTitle>
                    <DialogDescription>
                        Provide a reason for rejecting this destination. The user will receive an email with
                        your explanation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Destination Summary */}
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Destination:</span>
                            <span className="font-medium">{destination.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium">{destination.customer_name}</span>
                        </div>
                        <div className="flex items-start justify-between text-sm">
                            <span className="text-gray-600">URL:</span>
                            <span className="font-medium text-right break-all max-w-xs">
                                {destination.url}
                            </span>
                        </div>
                    </div>

                    {/* Rejection Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Rejection *</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., Invalid URL format, Security concerns, Duplicate destination..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-gray-500">
                            This reason will be sent to {destination.requested_by_email || "the user"} via email.
                        </p>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <p className="text-sm text-red-800">
                            <strong>Rejecting this destination will:</strong>
                        </p>
                        <ul className="text-sm text-red-700 mt-2 ml-4 list-disc space-y-1">
                            <li>Prevent it from being used for lead delivery</li>
                            <li>Send a rejection email to the requester with your reason</li>
                            <li>Mark the destination as rejected in the system</li>
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
                        onClick={handleReject}
                        disabled={loading || !reason.trim()}
                        variant="destructive"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Reject Destination
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
