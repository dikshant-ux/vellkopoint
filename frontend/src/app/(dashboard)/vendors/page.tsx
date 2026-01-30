"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { SourceLeadsSheet } from "@/components/leads/source-leads-sheet";
import { PerformanceSheet } from "@/components/system/performance-sheet";
import { Download, Pencil, Plus, Trash2, Eye, MoreHorizontal, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
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
import { VendorCreateDialog } from "@/components/vendors/vendor-create-dialog";
import { VendorStatusConfirmDialog } from "@/components/vendors/vendor-status-confirm-dialog";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

interface VendorStatsRow {
    id: string;
    readable_id?: string;
    name: string;
    leads: number;
    duplicates: number;
    leads_today: number;
    duplicates_today: number;
    leads_yesterday: number;
    last_7_days: number;
    last_30_days: number;
    last_90_days: number;
    last_180_days: number;
    last_365_days: number;
    all_time: number;
    status: string;
    _id?: string;
}

export default function VendorsPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<VendorStatsRow[]>([]);
    const [newVendorName, setNewVendorName] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(1);
    const [vendorToToggle, setVendorToToggle] = useState<{ id: string; name: string; status: string } | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<{ id: string; name: string } | null>(null);
    const [viewLeadsVendor, setViewLeadsVendor] = useState<{ id: string; name: string } | null>(null);
    const [performanceVendor, setPerformanceVendor] = useState<{ id: string; name: string } | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const isOwner = user?.role === "owner";
    const canCreate = isOwner || user?.permissions?.includes(Permission.CREATE_VENDORS);
    const canEdit = isOwner || user?.permissions?.includes(Permission.EDIT_VENDORS);
    const canDelete = isOwner || user?.permissions?.includes(Permission.DELETE_VENDORS);

    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        fetchVendors();
    }, [page, pageSize, debouncedSearch]);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const res = await api.get("/vendors/stats", {
                params: {
                    limit: pageSize,
                    skip: skip,
                    search: debouncedSearch || undefined
                }
            });
            setVendors(res.data.items);
            setTotal(res.data.total);
        } catch (error) {
            console.error("Failed to fetch vendors", error);
            setVendors([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const initToggleVendorStatus = (vendorId: string, currentStatus: string, name: string) => {
        setVendorToToggle({ id: vendorId, status: currentStatus, name });
    };

    const confirmToggleVendorStatus = async () => {
        if (!vendorToToggle) return;
        try {
            const currentStatus = vendorToToggle.status;
            const nextStatus = currentStatus === "enabled" ? "disabled" : "enabled";
            await api.put(`/vendors/${vendorToToggle.id}/status`, null, { params: { status: nextStatus } });
            fetchVendors();
        } catch (error) {
            console.error("Failed to toggle vendor status", error);
        } finally {
            setVendorToToggle(null);
        }
    };

    const createVendor = async () => {
        if (!newVendorName) return;
        try {
            await api.post("/vendors/", { name: newVendorName });
            setNewVendorName("");
            setIsDialogOpen(false);
            fetchVendors();
        } catch (error) {
            console.error("Failed to create vendor", error);
        }
    };

    const deleteVendor = async (vendorId: string) => {
        try {
            await api.delete(`/vendors/${vendorId}`);
            fetchVendors();
        } catch (error) {
            console.error("Failed to delete vendor", error);
            throw error;
        }
    };

    const handleDeleteConfirm = async () => {
        if (!vendorToDelete) return;
        await deleteVendor(vendorToDelete.id);
        setVendorToDelete(null); // Ensure close on success
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const pageRows = vendors;

    return (
        <div>
            <VendorStatusConfirmDialog
                vendor={vendorToToggle}
                onClose={() => setVendorToToggle(null)}
                onConfirm={confirmToggleVendorStatus}
            />

            <DeleteConfirmation
                open={!!vendorToDelete}
                onOpenChange={(open) => !open && setVendorToDelete(null)}
                title="Delete Vendor"
                description={`Are you sure you want to delete "${vendorToDelete?.name}"? This will permanently remove the vendor, all its sources, and all historical statistics. This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
            />

            <SourceLeadsSheet
                open={!!viewLeadsVendor}
                onOpenChange={(open) => !open && setViewLeadsVendor(null)}
                vendorId={viewLeadsVendor?.id || null}
                sourceId={null}
                title={viewLeadsVendor?.name}
            />

            <PerformanceSheet
                open={!!performanceVendor}
                onOpenChange={(open) => !open && setPerformanceVendor(null)}
                vendorId={performanceVendor?.id || null}
                entityName={performanceVendor?.name}
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Vendors</h1>
                {canCreate && (
                    <VendorCreateDialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        vendorName={newVendorName}
                        onVendorNameChange={setNewVendorName}
                        onCreate={createVendor}
                    />
                )}

                {/* Hide create trigger if no permission, but currently the trigger is implied by isDialogOpen logic? 
                    Wait, where is the trigger button? It seems I missed the button in the view. 
                    Ah, I see VendorCreateDialog but I don't see the button to OPEN it in the code I viewed.
                    Let's assume the button is near the dialog or header. 
                    Actually, line 180 has h1 and VendorCreateDialog. Maybe the button is inside VendorCreateDialog or near it?
                    The view ended at line 189. The button might be hidden or I missed it.
                    Let's look at the Dropdown actions first as that was the user request.
                */}
            </div>

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
                        <div className="relative">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-[300px] h-9 bg-white"
                                placeholder="Search by name or ID..."
                            />
                        </div>
                        {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating metrics...</span>}
                    </div>
                </div>

                {/* Keep page from horizontally scrolling; allow table itself to scroll */}
                <Table className="min-w-[1200px]">
                    <TableHeader className="sticky top-0 z-10 bg-white">
                        <TableRow className="bg-white">
                            <TableHead className="bg-white">Vendor ID</TableHead>
                            <TableHead className="bg-white">Vendor Name</TableHead>
                            <TableHead className="text-right bg-white"># Leads</TableHead>
                            <TableHead className="text-right bg-white"># Duplicates</TableHead>
                            <TableHead className="text-right bg-white"># Leads Today</TableHead>
                            <TableHead className="text-right bg-white"># Duplicates Today</TableHead>
                            <TableHead className="text-right bg-white"># Leads Yesterday</TableHead>
                            <TableHead className="text-right bg-white">Last 7 Days</TableHead>
                            <TableHead className="text-right bg-white">Last 30 Days</TableHead>
                            <TableHead className="text-right bg-white">Last 90 Days</TableHead>
                            <TableHead className="text-right bg-white">Last 180 Days</TableHead>
                            <TableHead className="text-right bg-white">Last 365 Days</TableHead>
                            <TableHead className="text-right bg-white">All Time</TableHead>
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
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[20px] ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            vendors.map((vendor, index) => (
                                <TableRow
                                    key={vendor.id || vendor._id || index}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/vendors/${vendor.id}`)}
                                >
                                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                                        {vendor.readable_id || vendor.id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.leads.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.duplicates.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.leads_today.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.duplicates_today.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.leads_yesterday.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.last_7_days.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.last_30_days.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.last_90_days.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.last_180_days.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.last_365_days.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums">{vendor.all_time.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={vendor.status === "enabled"}
                                                onCheckedChange={() => initToggleVendorStatus(vendor.id, vendor.status, vendor.name)}
                                            />
                                            <span className={`text-xs font-medium ${vendor.status === "enabled" ? "text-green-600" : "text-muted-foreground"}`}>
                                                {vendor.status === "enabled" ? "Enabled" : "Disabled"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>


                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                                    <DropdownMenuItem onClick={() => setPerformanceVendor({ id: vendor.id, name: vendor.name })}>
                                                        <LineChart className="mr-2 h-4 w-4" />
                                                        View Metrics
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setViewLeadsVendor({ id: vendor.id, name: vendor.name })}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Leads
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild disabled={!canEdit}>
                                                        <Link href={canEdit ? `/vendors/${vendor.id}` : "#"} className={!canEdit ? "pointer-events-none opacity-50" : ""}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem disabled title="Export coming soon">
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Export
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setVendorToDelete({ id: vendor.id, name: vendor.name })}
                                                        className="text-destructive focus:text-destructive"
                                                        disabled={!canDelete}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && vendors.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={15} className="text-center py-10 text-gray-500">
                                    No vendors found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-center gap-2 p-3">
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
        </div >
    );
}
