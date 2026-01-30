"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CustomerCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerName: string;
    onCustomerNameChange: (name: string) => void;
    onCreate: () => void;
}

export function CustomerCreateDialog({
    open,
    onOpenChange,
    customerName,
    onCustomerNameChange,
    onCreate,
}: CustomerCreateDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button suppressHydrationWarning>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Customer Name</Label>
                        <Input
                            id="name"
                            value={customerName}
                            onChange={(e) => onCustomerNameChange(e.target.value)}
                            placeholder="e.g. LeadBuyer LLC"
                            onKeyDown={(e) => e.key === "Enter" && onCreate()}
                        />
                    </div>
                    <Button onClick={onCreate} className="w-full" disabled={!customerName.trim()}>
                        Create Customer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
