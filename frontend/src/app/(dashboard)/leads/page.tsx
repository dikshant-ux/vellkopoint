"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Eye,
    Download,
    RefreshCw,
    X
} from "lucide-react";
import { Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadsTable } from "@/components/leads/leads-table";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataMaskingAlert, LimitedViewBadge } from "@/components/leads/data-masking-indicators";

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
    id?: string;
    _id: string;
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

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<string>("all");
    const [selectedSource, setSelectedSource] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Get current user for RBAC
    const { user, isLoading: authLoading } = useAuth();
    const isOwner = user?.role === "owner";
    const isLimitedView = user?.role === "user"; // Kept for masking logic

    // Permission Checks
    const canExport = isOwner || user?.permissions?.includes(Permission.EXPORT_LEADS);
    const canDelete = isOwner || user?.permissions?.includes(Permission.DELETE_LEADS);

    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        if (!authLoading) {
            fetchInitialData();
        }
    }, [authLoading, user]);

    useEffect(() => {
        fetchLeads();
    }, [page, pageSize, debouncedSearch, selectedVendor, selectedSource, selectedStatus, startDate, endDate]);

    const fetchInitialData = async () => {
        try {
            const hasVendorPerm = isOwner || user?.permissions?.includes(Permission.VIEW_VENDORS);
            const hasSourcePerm = isOwner || user?.permissions?.includes(Permission.VIEW_SOURCES);

            const [vRes, sRes] = await Promise.all([
                hasVendorPerm ? api.get("/vendors/") : Promise.resolve({ data: [] }),
                hasSourcePerm ? api.get("/sources/stats") : Promise.resolve({ data: [] })
            ]);

            if (hasVendorPerm) {
                setVendors(vRes.data);
            }

            if (hasSourcePerm) {
                // Format sources from stats response
                const rawSources = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.items || []);
                const sourceList = rawSources.map((item: any) => ({
                    id: item.source_id,
                    name: item.source_name,
                    vendor_id: item.vendor_id
                }));
                setSources(sourceList);
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const params: any = {
                limit: pageSize,
                skip: skip,
                search: debouncedSearch || undefined,
                vendor_id: selectedVendor === "all" ? undefined : selectedVendor,
                source_id: selectedSource === "all" ? undefined : selectedSource,
                status: selectedStatus === "all" ? undefined : selectedStatus,
                start_date: startDate ? startDate.toISOString() : undefined,
                end_date: endDate ? endDate.toISOString() : undefined,
            };

            const res = await api.get("/leads/", { params });
            setLeads(res.data.items);
            setTotal(res.data.total);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params: any = {
                search: debouncedSearch || undefined,
                vendor_id: selectedVendor === "all" ? undefined : selectedVendor,
                source_id: selectedSource === "all" ? undefined : selectedSource,
                status: selectedStatus === "all" ? undefined : selectedStatus,
                start_date: startDate ? startDate.toISOString() : undefined,
                end_date: endDate ? endDate.toISOString() : undefined,
            };

            // Use 'api' instance to ensure Authorization header is attached
            const res = await api.get("/leads/export", {
                params,
                responseType: 'blob'
            });

            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_export_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export leads", error);
        }
    };

    const resetFilters = () => {
        setSearch("");
        setSelectedVendor("all");
        setSelectedSource("all");
        setSelectedStatus("all");
        setStartDate(undefined);
        setEndDate(undefined);
        setPage(1);
    };

    const filteredSources = useMemo(() => {
        if (selectedVendor === "all") return sources;
        return sources.filter(s => s.vendor_id === selectedVendor);
    }, [sources, selectedVendor]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "processed": return "default";
            case "new": return "secondary";
            case "rejected": return "destructive";
            case "exported": return "outline";
            default: return "secondary";
        }
    };

    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">Leads</h1>
                        {isLimitedView && <LimitedViewBadge />}
                    </div>
                    <p className="text-muted-foreground mt-1">Monitor and analyze all incoming leads.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchLeads()}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    {canExport && (
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    )}
                </div>
            </div>

            {/* Data Masking Alert for Limited View Users */}
            <DataMaskingAlert show={isLimitedView} />

            {/* Filters */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Email, name, ID..."
                                    className="pl-8 bg-white"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">Vendor</label>
                            <Select value={selectedVendor} onValueChange={(v) => { setSelectedVendor(v); setSelectedSource("all"); setPage(1); }}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="All Vendors" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vendors</SelectItem>
                                    {vendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">Source</label>
                            <Select value={selectedSource} onValueChange={(v) => { setSelectedSource(v); setPage(1); }}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="All Sources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    {filteredSources.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">Status</label>
                            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="processed">Processed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="exported">Exported</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">From</label>
                            <DatePicker date={startDate} setDate={(d) => { setStartDate(d); setPage(1); }} className="w-full bg-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700">To</label>
                            <DatePicker date={endDate} setDate={(d) => { setEndDate(d); setPage(1); }} className="w-full bg-white" />
                        </div>
                    </div>

                    {(selectedVendor !== "all" || selectedSource !== "all" || selectedStatus !== "all" || startDate || endDate || search) && (
                        <div className="flex justify-end mt-4">
                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500">
                                <X className="mr-2 h-4 w-4" /> Clear All Filters
                            </Button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <LeadsTable
                        leads={leads}
                        vendors={vendors}
                        sources={sources}
                        onViewDetails={(lead) => setSelectedLead(lead)}
                        isLoading={loading}
                        canDelete={canDelete}
                    />
                </div>

                {/* Pagination */}
                {!loading && total > 0 && (
                    <div className="flex items-center justify-between p-4 border-t bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, total)}</span> of <span className="font-medium">{total}</span> leads
                            </div>
                            <div className="flex items-center gap-2 border-l pl-4">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(v) => {
                                        setPageSize(Number(v));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder={pageSize} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <div className="flex items-center gap-1 font-medium px-2">
                                {page} <span className="text-slate-400 font-normal">/</span> {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lead Details Dialog */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Lead Details</DialogTitle>
                        <DialogDescription>
                            Internal ID: {String(selectedLead?._id || '')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLead && (
                        <div className="space-y-6 mt-4">
                            {/* Summary Information */}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <tbody>
                                        <tr className="bg-white">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-1/4 align-top border-r">
                                                Status
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(selectedLead.status) as any}>{selectedLead.status}</Badge>
                                                {selectedLead.rejection_reason && (
                                                    <p className="text-xs text-red-600 mt-2 italic">{selectedLead.rejection_reason}</p>
                                                )}
                                            </td>
                                        </tr>
                                        <tr className="bg-slate-50">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-1/4 align-top border-r">
                                                Created At
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                {format(new Date(selectedLead.created_at), "PPP p")}
                                            </td>
                                        </tr>
                                        <tr className="bg-white">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-1/4 align-top border-r">
                                                Vendor
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                {vendors.find(v => v.id === selectedLead.vendor_id)?.name || String(selectedLead.vendor_id)}
                                            </td>
                                        </tr>
                                        <tr className="bg-slate-50">
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-1/4 align-top border-r">
                                                Source
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                {sources.find(s => s.id === selectedLead.source_id)?.name || String(selectedLead.source_id)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Routing Results */}
                            {selectedLead.routing_results && selectedLead.routing_results.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                        <div className="h-4 w-1 bg-blue-500 rounded-full" />
                                        Routing Results
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedLead.routing_results.map((result, idx) => (
                                            <div key={idx} className="p-3 border rounded-md bg-slate-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={result.status === "delivered" ? "default" : "destructive"}>
                                                            {result.status}
                                                        </Badge>
                                                        <span className="text-sm font-medium">{result.customer_name || String(result.customer_id)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-600 space-y-1">
                                                    {result.campaign_name && <p>Campaign: {result.campaign_name}</p>}
                                                    {result.destination_name && <p>Destination: {result.destination_name}</p>}
                                                    {result.error_message && <p className="text-red-600">Error: {result.error_message}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                    Lead Data Fields
                                </h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <tbody>
                                            {Object.entries(selectedLead.data).map(([key, value], index) => (
                                                <tr key={key} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase font-mono w-1/3 align-top border-r">
                                                        {key}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-900 break-words">
                                                        {String(value)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
