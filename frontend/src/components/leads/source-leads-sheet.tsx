"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SourceLeadsSheetProps {
    sourceId?: string | null;
    vendorId?: string | null;
    customerId?: string | null;
    campaignId?: string | null;
    title?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Lead {
    _id: string;
    created_at: string;
    status: string;
    data: Record<string, any>;
    original_payload: Record<string, any>;
    rejection_reason?: string;
    routing_results?: Array<{
        customer_id: string;
        customer_name?: string;
        campaign_id: string;
        campaign_name?: string;
        status: string;
        delivered_at: string;
        error_message?: string;
    }>;
}

export function SourceLeadsSheet({ sourceId, vendorId, customerId, campaignId, title, open, onOpenChange }: SourceLeadsSheetProps) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    const entityId = sourceId || vendorId || customerId || campaignId;
    const entityType = sourceId ? "source" : vendorId ? "vendor" : customerId ? "customer" : "campaign";

    useEffect(() => {
        if (open && entityId) {
            fetchLeads();
        }
    }, [open, entityId, page]);

    // Debounce search
    useEffect(() => {
        if (open && entityId) {
            const timer = setTimeout(() => {
                setPage(1); // Reset to page 1 on search
                fetchLeads();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * LIMIT;

            // Build params based on entity type
            const params: any = {
                limit: LIMIT,
                skip,
                search: search || undefined
            };

            if (sourceId) params.source_id = sourceId;
            if (vendorId) params.vendor_id = vendorId;
            if (customerId) params.customer_id = customerId;
            if (campaignId) params.campaign_id = campaignId;

            const res = await api.get(`/leads`, { params });

            if (res.data.items) {
                setLeads(res.data.items);
                setTotalPages(res.data.pages);
            } else {
                setLeads(res.data);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString();
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "processed": return "default";
            case "new": return "secondary";
            case "rejected": return "destructive";
            case "exported": return "outline";
            default: return "secondary";
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[800px] sm:max-w-[800px] flex flex-col h-full p-0">
                <div className="flex-1 overflow-y-auto p-6 pb-20">
                    <SheetHeader className="mb-6 space-y-4">
                        <div>
                            <SheetTitle>Recent Leads {title ? `- ${title}` : ""}</SheetTitle>
                            <SheetDescription>
                                View leads received from this {entityType}.
                            </SheetDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by email, name..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </SheetHeader>

                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-slate-400">
                            Loading leads...
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-slate-400 border border-dashed rounded-lg bg-slate-50">
                            <p>No leads found for this {entityType} yet.</p>
                            {entityType === "source" && <p className="text-sm mt-1">Send a test lead to see it appear here.</p>}
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Identifier</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.map((lead, index) => (
                                        <TableRow key={lead._id || index}>
                                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                {formatDate(lead.created_at)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {lead.data.email || lead.data.phone || lead.data.first_name || "Unknown"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(lead.status) as any} className="text-xs">
                                                    {lead.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Lead Details</DialogTitle>
                                                            <DialogDescription>
                                                                ID: {lead._id}
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="space-y-6 mt-4">
                                                            <div className="border rounded-md overflow-hidden">
                                                                <div className="bg-muted px-4 py-2 border-b text-sm font-medium">Lead Data</div>
                                                                <Table>
                                                                    <TableBody>
                                                                        {Object.entries(lead.data).map(([key, value]) => (
                                                                            <TableRow key={key} className="hover:bg-transparent">
                                                                                <TableCell className="w-1/3 font-medium bg-slate-50 text-xs py-2">{key}</TableCell>
                                                                                <TableCell className="text-xs py-2 font-mono break-all">
                                                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        {Object.keys(lead.data).length === 0 && (
                                                                            <TableRow>
                                                                                <TableCell colSpan={2} className="text-center text-slate-500 py-4 text-xs">No data fields found</TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>

                                                            {lead.status === "rejected" && lead.rejection_reason && (
                                                                <div className="border rounded-md overflow-hidden border-red-200">
                                                                    <div className="bg-red-50 px-4 py-2 border-b border-red-200 text-sm font-medium text-red-900">Rejection Details</div>
                                                                    <div className="p-4 text-sm text-red-700">
                                                                        {lead.rejection_reason}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {lead.routing_results && lead.routing_results.length > 0 && (
                                                                <div className="border rounded-md overflow-hidden">
                                                                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 text-sm font-medium text-blue-900">Routing Results</div>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="hover:bg-transparent">
                                                                                <TableHead className="text-[10px] py-2">Campaign</TableHead>
                                                                                <TableHead className="text-[10px] py-2">Status</TableHead>
                                                                                <TableHead className="text-[10px] py-2">Delivered At</TableHead>
                                                                                <TableHead className="text-[10px] py-2">Details</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {lead.routing_results.map((res: any, idx: number) => (
                                                                                <TableRow key={idx} className="hover:bg-transparent">
                                                                                    <TableCell className="text-xs py-2 truncate max-w-[150px]" title={res.campaign_name || res.campaign_id}>
                                                                                        {res.campaign_name || `${res.campaign_id.slice(0, 8)}...`}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2">
                                                                                        <Badge variant={res.status === "delivered" ? "default" : "destructive"} className="text-[9px] px-1.5 py-0">
                                                                                            {res.status}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px] py-2 whitespace-nowrap">
                                                                                        {formatDate(res.delivered_at)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px] py-2 text-muted-foreground truncate max-w-[200px]">
                                                                                        {res.error_message || "-"}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {leads.length > 0 && (
                    <div className="border-t p-4 flex items-center justify-between bg-white mt-auto">
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
