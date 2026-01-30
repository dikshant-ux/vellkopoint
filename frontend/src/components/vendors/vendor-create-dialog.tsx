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

interface VendorCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorName: string;
    onVendorNameChange: (name: string) => void;
    onCreate: () => void;
}

export function VendorCreateDialog({
    open,
    onOpenChange,
    vendorName,
    onVendorNameChange,
    onCreate,
}: VendorCreateDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Vendor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Vendor Name</Label>
                        <Input
                            id="name"
                            value={vendorName}
                            onChange={(e) => onVendorNameChange(e.target.value)}
                            placeholder="e.g. LeadProvider Inc."
                        />
                    </div>
                    <Button onClick={onCreate} className="w-full">
                        Create Vendor
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
