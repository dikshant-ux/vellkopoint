"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface RoutingResult {
    customer_id: string;
    customer_name?: string;
    campaign_id: string;
    campaign_name?: string;
    destination_id: string;
    destination_name?: string;
    status: string;
    error_message?: string;
}

interface Lead {
    id?: string; // Optional Pydantic ID
    _id: string; // Required MongoDB ID
    vendor_id: string;
    source_id: string;
    lead_id?: string;
    external_id?: string;
    data: Record<string, any>;
    status: string;
    rejection_reason?: string;
    routing_results?: RoutingResult[];
    created_at: string;
}

interface Vendor {
    id: string;
    name: string;
}

interface Source {
    id: string;
    name: string;
    vendor_id: string;
}

interface LeadsTableProps {
    leads: Lead[];
    vendors: Vendor[];
    sources: Source[];
    onViewDetails: (lead: Lead) => void;
    isLoading?: boolean;
    canDelete?: boolean;
}

export function LeadsTable({ leads, vendors, sources, onViewDetails, isLoading, canDelete }: LeadsTableProps) {
    const getStatusVariant = (status: string) => {
        switch (status) {
            case "processed": return "default";
            case "new": return "secondary";
            case "rejected": return "destructive";
            case "exported": return "outline";
            default: return "secondary";
        }
    };

    const getRoutingStatusVariant = (status: string) => {
        switch (status) {
            case "delivered": return "default";
            case "failed": return "destructive";
            case "pending": return "secondary";
            default: return "secondary";
        }
    };

    if (isLoading) {
        return (
            <Table className="text-[13px]">
                <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                        <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Lead ID</TableHead>
                        <TableHead className="w-[180px] text-slate-900 font-bold whitespace-nowrap">Created At</TableHead>
                        <TableHead className="w-[200px] text-slate-900 font-bold whitespace-nowrap">Lead Identifier</TableHead>
                        <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Vendor</TableHead>
                        <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Source</TableHead>
                        <TableHead className="w-[100px] text-slate-900 font-bold whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-slate-900 font-bold whitespace-nowrap">Routing Results</TableHead>
                        <TableHead className="w-[80px] text-right text-slate-900 font-bold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(10)].map((_, i) => (
                        <TableRow key={i} className="border-b">
                            <TableCell className="py-3"><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Table className="text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                    <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Lead ID</TableHead>
                    <TableHead className="w-[180px] text-slate-900 font-bold whitespace-nowrap">Created At</TableHead>
                    <TableHead className="w-[200px] text-slate-900 font-bold whitespace-nowrap">Lead Identifier</TableHead>
                    <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Vendor</TableHead>
                    <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Source</TableHead>
                    <TableHead className="w-[100px] text-slate-900 font-bold whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-slate-900 font-bold whitespace-nowrap">Routing Results</TableHead>
                    <TableHead className="w-[80px] text-right text-slate-900 font-bold">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leads.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-20 text-muted-foreground bg-slate-50/30">
                            No leads found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : (
                    leads.map((lead, index) => {
                        const vendor = vendors.find(v => v.id === lead.vendor_id);
                        const source = sources.find(s => s.id === lead.source_id);

                        return (
                            <TableRow
                                key={typeof lead.id === 'string' ? lead.id : (typeof lead._id === 'string' ? lead._id : `lead-${index}`)}
                                className="hover:bg-blue-50/30 group transition-colors border-b"
                            >
                                <TableCell className="font-mono font-bold text-slate-900 py-3">
                                    {lead.external_id || lead.lead_id || `LD-${(typeof lead.id === 'string' ? lead.id : (typeof lead._id === 'string' ? lead._id : "")).slice(-6).toUpperCase()}`}
                                </TableCell>
                                <TableCell className="text-xs text-slate-600">
                                    {format(new Date(lead.created_at), "MMM d, yyyy HH:mm:ss")}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">
                                    {lead.data.email || lead.data.phone || lead.data.full_name || "Unknown Lead"}
                                </TableCell>
                                <TableCell className="text-slate-700">
                                    {vendor?.name || <span className="text-slate-400 font-mono text-xs">{String(lead.vendor_id).slice(0, 8)}</span>}
                                </TableCell>
                                <TableCell className="text-slate-700">
                                    {source?.name || <span className="text-slate-400 font-mono text-xs">{String(lead.source_id).slice(0, 8)}</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(lead.status) as any} className="capitalize">
                                        {lead.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {lead.routing_results && lead.routing_results.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {lead.routing_results.map((result, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-50 border rounded-md px-2 py-1">
                                                    <Badge
                                                        variant={getRoutingStatusVariant(result.status) as any}
                                                        className="text-[10px] px-1.5 py-0 h-4"
                                                    >
                                                        {result.status}
                                                    </Badge>
                                                    <span className="text-xs text-slate-600">
                                                        {result.customer_name || String(result.customer_id).slice(0, 8)}
                                                        {result.campaign_name && (
                                                            <span className="text-slate-400"> → {result.campaign_name}</span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No routing</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onViewDetails(lead)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );
}
