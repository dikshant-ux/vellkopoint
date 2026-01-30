"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationProps {
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function DeleteConfirmation({
    title,
    description,
    onConfirm,
    trigger,
    open,
    onOpenChange,
}: DeleteConfirmationProps) {
    const [confirmText, setConfirmText] = useState("");
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isControlled = open !== undefined;
    const finalIsOpen = isControlled ? open : internalIsOpen;
    const finalSetIsOpen = isControlled ? onOpenChange : setInternalIsOpen;

    const handleConfirm = async () => {
        if (confirmText.toLowerCase() === "yes") {
            setIsLoading(true);
            try {
                await onConfirm();
                if (finalSetIsOpen) finalSetIsOpen(false);
                setConfirmText("");
            } catch (error) {
                console.error("Delete failed", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Dialog open={finalIsOpen} onOpenChange={finalSetIsOpen}>
            {isControlled ? null : (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                    <div className="mt-4 p-3 bg-muted rounded-md border border-border">
                        <p className="text-sm font-medium mb-2">
                            To confirm, please type <span className="font-bold text-foreground">yes</span> below:
                        </p>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Type "yes" here'
                            className="bg-background"
                            autoFocus
                        />
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (finalSetIsOpen) finalSetIsOpen(false);
                            setConfirmText("");
                        }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={confirmText.toLowerCase() !== "yes" || isLoading}
                    >
                        {isLoading ? "Deleting..." : "Delete Permanently"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
