"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, BookOpen, Eye, Pencil, LineChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SourceLeadsSheet } from "@/components/leads/source-leads-sheet";
import { PerformanceSheet } from "@/components/system/performance-sheet";
import { useDebounce } from "@/hooks/use-debounce";
import { VendorSourceFormDialog } from "@/components/vendors/vendor-source-form-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceStatusConfirmDialog } from "@/components/vendors/source-status-confirm-dialog";
import { useBreadcrumbs } from "@/context/breadcrumb-context";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { MoreHorizontal } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

interface Source {
    id: string;
    name: string;
    type: string;
    api_key: string;
    config: any; // Simplified for display purposes
    validation?: any;
    mapping: any;
    rules: any;
}

interface Vendor {
    id: string;
    readable_id?: string;
    name: string;
    sources: Source[];
}

interface VendorSourceStatsRow {
    source_id: string;
    readable_id?: string;
    source_name: string;
    create_date: string;
    auth_key: string;
    source_group: string | null;
    dupe_check: string;
    leads: number;
    duplicates: number;
    duplicates_today: number;
    today: number;
    yesterday: number;
    last_week: number;
    last_month: number;
    last_year: number;
    all_time: number;
    status: string;
}

export default function VendorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sourceStats, setSourceStats] = useState<VendorSourceStatsRow[]>([]);
    const [selectedSourceForLeads, setSelectedSourceForLeads] = useState<string | null>(null);
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
    const [sourceToToggle, setSourceToToggle] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
    const [sourceToDelete, setSourceToDelete] = useState<{ id: string; name: string } | null>(null);
    const [performanceSource, setPerformanceSource] = useState<{ id: string; name: string } | null>(null);
    const [search, setSearch] = useState("");
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Permission Checks
    const isOwner = user?.role === "owner";
    const canCreate = isOwner || user?.permissions?.includes(Permission.CREATE_SOURCES);
    const canEdit = isOwner || user?.permissions?.includes(Permission.EDIT_SOURCES);
    const canDelete = isOwner || user?.permissions?.includes(Permission.DELETE_SOURCES);

    const debouncedSearch = useDebounce(search, 500);

    // Unwrap params using React.use()
    const resolvedParams = use(params);
    const vendorId = resolvedParams.id;
    const { setOverride } = useBreadcrumbs();

    useEffect(() => {
        if (vendor) {
            setOverride(`/vendors/${vendor.id}`, vendor.name);
        }
    }, [vendor, setOverride]);

    useEffect(() => {
        if (vendorId) {
            fetchVendor();
            fetchSourceStats();
        }
    }, [vendorId, page, pageSize, debouncedSearch]);

    const fetchVendor = async () => {
        try {
            const res = await api.get(`/vendors/${vendorId}`);
            setVendor(res.data);
        } catch (error) {
            console.error("Failed to fetch vendor", error);
        }
    };

    const fetchSourceStats = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const res = await api.get(`/vendors/${vendorId}/sources/stats`, {
                params: {
                    limit: pageSize,
                    skip: skip,
                    search: debouncedSearch || undefined
                }
            });
            setSourceStats(res.data.items);
            setTotal(res.data.total);
        } catch (error) {
            console.error("Failed to fetch source stats", error);
            setSourceStats([]);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);

    if (!vendor) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex justify-between items-start">
                    <div>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-32" />
                </div>

                <div className="bg-white rounded-md border min-h-[400px] p-4">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-9 w-[200px]" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const pageRows = sourceStats;

    const handleDialogSuccess = () => {
        setIsDialogOpen(false);
        setEditingSourceId(null);
        fetchVendor();
        fetchSourceStats();
    };

    const openAddSource = () => {
        setEditingSourceId(null);
        setIsDialogOpen(true);
    };

    const editSource = (sourceId: string) => {
        setEditingSourceId(sourceId);
        setIsDialogOpen(true);
    };

    const initToggleSourceStatus = (sourceId: string, currentStatus: string, name: string) => {
        setSourceToToggle({ id: sourceId, currentStatus, name });
    };

    const confirmToggleSourceStatus = async () => {
        if (!sourceToToggle || !vendor) return;
        try {
            const isActive = sourceToToggle.currentStatus.toLowerCase() === "enabled";
            const nextStatus = isActive ? "disabled" : "enabled";
            const source = vendor.sources.find(s => s.id === sourceToToggle.id);
            if (!source) return;

            const payload = {
                config: {
                    ...source.config,
                    status: nextStatus
                }
            };

            await api.put(`/vendors/${vendorId}/sources/${sourceToToggle.id}`, payload);
            fetchSourceStats();
        } catch (error) {
            console.error("Failed to toggle source status", error);
        } finally {
            setSourceToToggle(null);
        }
    };

    const cloneSource = async (sourceId: string) => {
        if (!vendor) return;
        const source = vendor.sources.find(s => s.id === sourceId);
        if (!source) return;

        try {
            const payload = {
                name: `${source.name} (clone)`,
                type: source.type,
                config: {
                    ...source.config,
                    status: "disabled"
                },
                validation: source.validation,
                mapping: source.mapping,
                rules: source.rules,
            };

            await api.post(`/vendors/${vendorId}/sources`, payload);
            fetchVendor();
            fetchSourceStats();
        } catch (error) {
            console.error("Failed to clone source", error);
        }
    };

    const deleteSource = async (sourceId: string) => {
        try {
            await api.delete(`/vendors/${vendorId}/sources/${sourceId}`);
            fetchVendor();
            fetchSourceStats();
        } catch (error) {
            console.error("Failed to delete source", error);
            throw error;
        }
    };

    const handleDeleteConfirm = async () => {
        if (!sourceToDelete) return;
        await deleteSource(sourceToDelete.id);
        setSourceToDelete(null);
    };

    return (
        <div>
            <SourceStatusConfirmDialog
                source={sourceToToggle}
                onClose={() => setSourceToToggle(null)}
                onConfirm={confirmToggleSourceStatus}
            />

            <DeleteConfirmation
                open={!!sourceToDelete}
                onOpenChange={(open) => !open && setSourceToDelete(null)}
                title="Delete Source"
                description={`Are you sure you want to delete "${sourceToDelete?.name}"? This will permanently remove the source and all its historical statistics. This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
            />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{vendor.name}</h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">ID: {vendor.readable_id || vendor.id}</p>
                </div>

                {canCreate && (
                    <Button onClick={openAddSource}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Source
                    </Button>
                )}

                <VendorSourceFormDialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setEditingSourceId(null);
                    }}
                    vendorId={vendor.id}
                    vendorName={vendor.name}
                    sourceId={editingSourceId}
                    onSuccess={handleDialogSuccess}
                />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-md border overflow-hidden">
                    <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between border-b bg-white">
                        <div className="flex items-center gap-2 text-sm">
                            <span>Showing</span>
                            <span className="font-medium">
                                {total === 0 ? 0 : startIndex + 1}
                            </span>
                            <span>to</span>
                            <span className="font-medium">{endIndex}</span>
                            <span>of</span>
                            <span className="font-medium">{total}</span>
                            <span>entries</span>

                            <select
                                className="ml-3 rounded-md border px-2 py-1 text-sm"
                                value={pageSize}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setPageSize(next);
                                    setPage(1);
                                }}
                            >
                                {[10, 25, 50, 100].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            <span className="text-sm text-muted-foreground">records per page</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm">Search:</span>
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-[260px]"
                                placeholder="Source name or ID"
                            />
                            {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating metrics...</span>}
                        </div>
                    </div>

                    <Table className="min-w-[1400px]">
                        <TableHeader className="sticky top-0 z-10 bg-white">
                            <TableRow className="bg-white">
                                <TableHead className="bg-white">Source ID</TableHead>
                                <TableHead className="bg-white">Source Name</TableHead>
                                <TableHead className="bg-white">Create Date</TableHead>
                                <TableHead className="bg-white">Auth Key</TableHead>
                                <TableHead className="bg-white">Source Group</TableHead>
                                <TableHead className="bg-white">Dupe Check</TableHead>
                                <TableHead className="text-right bg-white"># Leads</TableHead>
                                <TableHead className="text-right bg-white"># Duplicates</TableHead>
                                <TableHead className="text-right bg-white"># Duplicates Today</TableHead>
                                <TableHead className="text-right bg-white"># Today</TableHead>
                                <TableHead className="text-right bg-white"># Yesterday</TableHead>
                                <TableHead className="text-right bg-white"># Last Week</TableHead>
                                <TableHead className="text-right bg-white"># Last Month</TableHead>
                                <TableHead className="text-right bg-white"># Last Year</TableHead>
                                <TableHead className="text-right bg-white"># All Time</TableHead>
                                <TableHead className="bg-white">Status</TableHead>
                                <TableHead className="text-right bg-white">Options</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i} className="border-b">
                                        <TableCell className="py-3"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[20px] ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                pageRows.map((s) => (
                                    <TableRow key={s.source_id}>
                                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                                            {s.readable_id || s.source_id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell className="font-medium">{s.source_name}</TableCell>
                                        <TableCell>{s.create_date}</TableCell>
                                        <TableCell className="font-mono text-xs max-w-[260px] truncate">{s.auth_key}</TableCell>
                                        <TableCell>{s.source_group || "-"}</TableCell>
                                        <TableCell>{s.dupe_check}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.leads.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.duplicates.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.duplicates_today.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.today.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.yesterday.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.last_week.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.last_month.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.last_year.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.all_time.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={s.status.toLowerCase() === "enabled"}
                                                    onCheckedChange={() => initToggleSourceStatus(s.source_id, s.status, s.source_name)}
                                                />
                                                <span className={`text-xs font-medium ${s.status.toLowerCase() === "enabled" ? "text-green-600" : "text-muted-foreground"}`}>
                                                    {s.status.toLowerCase() === "enabled" ? "Enabled" : "Disabled"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => editSource(s.source_id)} disabled={!canEdit}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => window.open(`/public/docs/${s.source_id}`, '_blank')}>
                                                        <BookOpen className="mr-2 h-4 w-4" />
                                                        View Docs
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => cloneSource(s.source_id)} disabled={!canCreate}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Clone
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setPerformanceSource({ id: s.source_id, name: s.source_name })}>
                                                        <LineChart className="mr-2 h-4 w-4" />
                                                        View Metrics
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSelectedSourceForLeads(s.source_id)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Leads
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setSourceToDelete({ id: s.source_id, name: s.source_name })}
                                                        className="text-destructive focus:text-destructive"
                                                        disabled={!canDelete}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {!loading && sourceStats.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={16} className="text-center py-10 text-gray-500">
                                        No sources configured. Add one to start ingesting data.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-center gap-2 p-3 border-t bg-white">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ← Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                            {currentPage}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
            </div>

            <SourceLeadsSheet
                open={!!selectedSourceForLeads}
                onOpenChange={(open) => !open && setSelectedSourceForLeads(null)}
                sourceId={selectedSourceForLeads}
            />

            <PerformanceSheet
                open={!!performanceSource}
                onOpenChange={(open) => !open && setPerformanceSource(null)}
                sourceId={performanceSource?.id || null}
                entityName={performanceSource?.name}
            />
        </div>
    );
}
