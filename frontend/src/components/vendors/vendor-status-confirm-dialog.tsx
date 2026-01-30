"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface VendorStatusConfirmDialogProps {
    vendor: { id: string; name: string; status: string } | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function VendorStatusConfirmDialog({
    vendor,
    onClose,
    onConfirm,
}: VendorStatusConfirmDialogProps) {
    const isOpen = !!vendor;
    const isCurrentlyActive = vendor?.status === "active";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Status Change</DialogTitle>
                </DialogHeader>
                {vendor && (
                    <>
                        <div className="py-4">
                            <p>
                                Are you sure you want to <strong>{isCurrentlyActive ? "Disable" : "Enable"}</strong> the vendor <strong>{vendor.name}</strong>?
                            </p>
                            {isCurrentlyActive && (
                                <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded">
                                    Warning: This will also disable all sources associated with this vendor.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={onConfirm} variant={isCurrentlyActive ? "destructive" : "default"}>
                                Confirm
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
