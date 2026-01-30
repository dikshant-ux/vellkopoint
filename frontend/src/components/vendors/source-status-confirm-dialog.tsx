"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface SourceStatusConfirmDialogProps {
    source: { id: string; name: string; currentStatus: string } | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function SourceStatusConfirmDialog({
    source,
    onClose,
    onConfirm,
}: SourceStatusConfirmDialogProps) {
    const isOpen = !!source;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Status Change</DialogTitle>
                </DialogHeader>
                {source && (
                    <>
                        <div className="py-4">
                            <p>
                                Are you sure you want to <strong>{source.currentStatus.toLowerCase() === "active" ? "Disable" : "Enable"}</strong> the source <strong>{source.name}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={onConfirm}>Confirm</Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
