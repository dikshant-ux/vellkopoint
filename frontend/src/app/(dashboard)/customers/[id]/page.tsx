"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Link as LinkIcon, Globe, Eye, BarChart3, Check, X } from "lucide-react";
import { useBreadcrumbs } from "@/context/breadcrumb-context";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { CampaignFormDialog } from "@/components/campaigns/campaign-form-dialog";
import { DestinationFormDialog } from "@/components/customers/destination-form-dialog";
import { SourceLeadsSheet } from "@/components/leads/source-leads-sheet";
import { PerformanceSheet } from "@/components/system/performance-sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

interface Customer {
    id: string;
    readable_id?: string;
    name: string;
    status: string;
    destinations: any[];
    campaigns: any[];
}

const CAMPAIGN_COLUMN_DEFINITIONS = [
    { key: "id", label: "Camp ID" },
    { key: "name", label: "Campaign Name" },
    { key: "destination", label: "Target Destination" },
    { key: "today_assigned", label: "Assigned Today" },
    { key: "today_delivered", label: "Delivered Today" },
    { key: "today_rejected", label: "Rejected Today" },
    { key: "yesterday", label: "Delivered Yest." },
    { key: "week", label: "Delivered Week" },
    { key: "total", label: "Delivered Total" },
    { key: "priority", label: "Priority" },
    { key: "weight", label: "Weight (%)" },
    { key: "status", label: "Status" },
    { key: "options", label: "Options" },
];

export default function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
    const [isDestinationDialogOpen, setIsDestinationDialogOpen] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
    const [editingDestinationData, setEditingDestinationData] = useState<any>(null);
    const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
    const [destinationToDelete, setDestinationToDelete] = useState<{ id: string; name: string } | null>(null);
    const [selectedCustomerForLeads, setSelectedCustomerForLeads] = useState<string | null>(null);
    const [selectedCampaignForLeads, setSelectedCampaignForLeads] = useState<{ id: string; name: string } | null>(null);
    const [selectedCustomerForMetrics, setSelectedCustomerForMetrics] = useState<string | null>(null);
    const [selectedCampaignForMetrics, setSelectedCampaignForMetrics] = useState<{ id: string; name: string } | null>(null);

    const { user } = useAuth();
    // Permission Checks
    const isOwner = user?.role === "owner";

    // Campaign Permissions
    const canCreateCampaign = isOwner || user?.permissions?.includes(Permission.CREATE_CAMPAIGNS);
    const canEditCampaign = isOwner || user?.permissions?.includes(Permission.EDIT_CAMPAIGNS);
    const canDeleteCampaign = isOwner || user?.permissions?.includes(Permission.DELETE_CAMPAIGNS);

    // Destination Permissions
    const canViewDestinations = isOwner || user?.permissions?.includes(Permission.VIEW_DESTINATIONS);
    const canCreateDestination = isOwner || user?.permissions?.includes(Permission.CREATE_DESTINATIONS);
    const canEditDestination = isOwner || user?.permissions?.includes(Permission.EDIT_DESTINATIONS);
    const canDeleteDestination = isOwner || user?.permissions?.includes(Permission.DELETE_DESTINATIONS);

    // Search & Pagination State
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [visibleCampaignColumns, setVisibleCampaignColumns] = useState<Record<string, boolean>>(
        CAMPAIGN_COLUMN_DEFINITIONS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
    const [pendingCampaignColumns, setPendingCampaignColumns] = useState<Record<string, boolean>>(visibleCampaignColumns);
    const [isCampaignColumnDropdownOpen, setIsCampaignColumnDropdownOpen] = useState(false);

    // Sync pending columns when dropdown opens
    useEffect(() => {
        if (isCampaignColumnDropdownOpen) {
            setPendingCampaignColumns(visibleCampaignColumns);
        }
    }, [isCampaignColumnDropdownOpen, visibleCampaignColumns]);

    // Load saved columns from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("customer-campaign-table-columns");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setVisibleCampaignColumns(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse saved columns", e);
            }
        }
    }, []);

    const debouncedSearch = useDebounce(search, 300); // Shorter debounce for client-side

    const resolvedParams = use(params);
    const customerId = resolvedParams.id;
    const { setOverride } = useBreadcrumbs();

    useEffect(() => {
        if (customer) {
            setOverride(`/customers/${customer.id}`, customer.name);
        }
    }, [customer, setOverride]);

    useEffect(() => {
        if (customerId) {
            fetchCustomer();
        }
    }, [customerId]);

    const fetchCustomer = async () => {
        try {
            const res = await api.get(`/customers/${customerId}`);
            setCustomer(res.data);
        } catch (error) {
            console.error("Failed to fetch customer", error);
        }
    };

    const handleCampaignSuccess = () => {
        setIsCampaignDialogOpen(false);
        setEditingCampaignId(null);
        fetchCustomer();
    };

    const handleDestinationSuccess = () => {
        setIsDestinationDialogOpen(false);
        setEditingDestinationId(null);
        setEditingDestinationData(null);
        fetchCustomer();
    };

    const toggleCampaignStatus = async (id: string, currentStatus: string, name: string) => {
        try {
            const nextStatus = currentStatus === "enabled" ? "disabled" : "enabled";
            await api.put(`/customers/${customerId}/campaigns/${id}`, {
                config: { status: nextStatus }
            });
            fetchCustomer();
        } catch (error) {
            console.error("Failed to toggle campaign status", error);
        }
    };

    const deleteCampaign = async () => {
        if (!campaignToDelete) return;
        try {
            await api.delete(`/customers/${customerId}/campaigns/${campaignToDelete.id}`);
            setCampaignToDelete(null);
            fetchCustomer();
        } catch (error) {
            console.error("Failed to delete campaign", error);
        }
    };

    const deleteDestination = async () => {
        if (!destinationToDelete) return;
        try {
            await api.delete(`/customers/${customerId}/destinations/${destinationToDelete.id}`);
            setDestinationToDelete(null);
            fetchCustomer();
        } catch (error) {
            console.error("Failed to delete destination", error);
        }
    };

    const [destinationToReject, setDestinationToReject] = useState<{ id: string; name: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleApproveDestination = async (destinationId: string) => {
        try {
            await api.post(`/customers/destinations/${destinationId}/approve`);
            fetchCustomer();
        } catch (error) {
            console.error("Failed to approve destination", error);
        }
    };

    const handleRejectDestination = async () => {
        if (!destinationToReject) return;
        try {
            await api.post(`/customers/destinations/${destinationToReject.id}/reject`, {
                reason: rejectionReason || "No reason provided"
            });
            setDestinationToReject(null);
            setRejectionReason("");
            fetchCustomer();
        } catch (error) {
            console.error("Failed to reject destination", error);
        }
    };

    // Derived filtered and paginated campaigns
    const filteredCampaigns = customer?.campaigns.filter(c =>
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (c.readable_id && c.readable_id.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        c.id.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) || [];

    const paginatedCampaigns = filteredCampaigns.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));

    if (!customer) {
        return (
            <div className="space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-start">
                    <div>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-32" />
                    </div>
                </div>

                {/* Destinations Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 bg-white rounded-lg border h-[100px] flex flex-col justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-4 w-10" />
                        </div>
                    ))}
                </div>

                {/* Campaigns Skeleton */}
                <div className="bg-white rounded-md border overflow-hidden shadow-sm">
                    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b bg-slate-50/50">
                        <div className="flex flex-col gap-1">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-3 w-60" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-9 w-[250px]" />
                        </div>
                    </div>
                    <CampaignTable
                        campaigns={[]}
                        destinations={[]}
                        onEdit={() => { }}
                        onDelete={() => { }}
                        onToggleStatus={() => { }}
                        isLoading={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <DeleteConfirmation
                open={!!campaignToDelete}
                onOpenChange={(open) => !open && setCampaignToDelete(null)}
                title="Delete Campaign"
                description={`Are you sure you want to delete "${campaignToDelete?.name}"?`}
                onConfirm={deleteCampaign}
            />

            <DeleteConfirmation
                open={!!destinationToDelete}
                onOpenChange={(open) => !open && setDestinationToDelete(null)}
                title="Delete Destination"
                description={`Are you sure you want to delete "${destinationToDelete?.name}"? This endpoint will be removed from all associated campaigns.`}
                onConfirm={deleteDestination}
            />

            <Dialog open={!!destinationToReject} onOpenChange={(open) => !open && setDestinationToReject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Destination</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting "{destinationToReject?.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Rejection Reason</Label>
                            <Input
                                id="reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g. Invalid URL configuration"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDestinationToReject(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectDestination} disabled={!rejectionReason}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CampaignFormDialog
                open={isCampaignDialogOpen}
                onOpenChange={setIsCampaignDialogOpen}
                customerId={customer.id}
                campaignId={editingCampaignId}
                destinations={customer.destinations}
                onSuccess={handleCampaignSuccess}
            />

            <DestinationFormDialog
                open={isDestinationDialogOpen}
                onOpenChange={setIsDestinationDialogOpen}
                customerId={customer.id}
                destinationId={editingDestinationId}
                initialData={editingDestinationData}
                onSuccess={handleDestinationSuccess}
            />

            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">{customer.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-500 text-sm font-mono">ID: {customer.readable_id || customer.id}</p>
                        <Badge variant={customer.status === "enabled" ? "default" : "secondary"}>
                            {customer.status === "enabled" ? "Active" : "Disabled"}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedCustomerForLeads(customer.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Leads
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedCustomerForMetrics(customer.id)}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Metrics
                    </Button>
                    {canCreateDestination && (
                        <Button variant="outline" onClick={() => {
                            setEditingDestinationId(null);
                            setEditingDestinationData(null);
                            setIsDestinationDialogOpen(true);
                        }}>
                            <Globe className="w-4 h-4 mr-2" />
                            Manage Endpoints
                        </Button>
                    )}
                    {canCreateCampaign && (
                        <Button onClick={() => { setEditingCampaignId(null); setIsCampaignDialogOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Campaign
                        </Button>
                    )}
                </div>
            </div>

            {/* Destinations Summary */}
            {canViewDestinations && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customer.destinations.map((d, index) => (
                        <div key={d.id || d._id || index} className="p-4 bg-white rounded-lg border flex justify-between items-start group">
                            <div className="space-y-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="font-semibold text-sm truncate">{d.name}</span>
                                    {d.approval_status === "pending" && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                                            Pending
                                        </Badge>
                                    )}
                                    {d.approval_status === "rejected" && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-700 border-red-200">
                                            Rejected
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono truncate">{d.config.url}</div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{d.config.method}</Badge>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {d.approval_status === "pending" && (isOwner || user?.role === "admin") && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleApproveDestination(d.id || d._id)}
                                            title="Approve Destination"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDestinationToReject({ id: d.id || d._id, name: d.name })}
                                            title="Reject Destination"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                    onClick={() => {
                                        setEditingDestinationId(d.id || d._id);
                                        setEditingDestinationData(d);
                                        setIsDestinationDialogOpen(true);
                                    }}
                                    disabled={!canEditDestination}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive/80"
                                    onClick={() => setDestinationToDelete({ id: d.id || d._id, name: d.name })}
                                    disabled={!canDeleteDestination}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {customer.destinations.length === 0 && (
                        <div className="col-span-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50">
                            <p className="text-sm">No destination endpoints configured.</p>
                            {canCreateDestination && (
                                <Button variant="link" size="sm" onClick={() => setIsDestinationDialogOpen(true)}>Add your first endpoint</Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Campaigns Table */}
            <div className="bg-white rounded-md border overflow-hidden shadow-sm">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b bg-slate-50/50">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold text-slate-900 leading-none">Routing Campaigns</h2>
                        <span className="text-xs text-muted-foreground mt-1">Define how leads are mapped and delivered.</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-[250px] h-9 bg-white text-xs"
                                placeholder="Search campaigns..."
                            />
                        </div>

                        <DropdownMenu open={isCampaignColumnDropdownOpen} onOpenChange={setIsCampaignColumnDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 flex bg-white">
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    View
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[300px] p-0">
                                <DropdownMenuLabel className="px-4 py-2">Toggle Columns</DropdownMenuLabel>
                                <div className="px-4 pb-2 flex gap-4 text-xs text-muted-foreground">
                                    <button
                                        className="hover:text-primary transition-colors hover:underline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const update = { ...pendingCampaignColumns };
                                            CAMPAIGN_COLUMN_DEFINITIONS.forEach(col => {
                                                if (!["id", "name", "destination", "status", "options"].includes(col.key)) {
                                                    update[col.key] = true;
                                                }
                                            });
                                            setPendingCampaignColumns(update);
                                        }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        className="hover:text-primary transition-colors hover:underline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const update = { ...pendingCampaignColumns };
                                            CAMPAIGN_COLUMN_DEFINITIONS.forEach(col => {
                                                if (!["id", "name", "destination", "status", "options"].includes(col.key)) {
                                                    update[col.key] = false;
                                                }
                                            });
                                            setPendingCampaignColumns(update);
                                        }}
                                    >
                                        Unselect All
                                    </button>
                                </div>
                                <DropdownMenuSeparator />
                                <div className="p-2 grid gap-2 max-h-[300px] overflow-y-auto">
                                    {CAMPAIGN_COLUMN_DEFINITIONS
                                        .filter(col => !["id", "name", "destination", "status", "options"].includes(col.key))
                                        .map((column) => (
                                            <div key={column.key} className="flex items-center space-x-2 rounded p-1 hover:bg-slate-100">
                                                <Checkbox
                                                    id={`camp-col-${column.key}`}
                                                    checked={pendingCampaignColumns[column.key]}
                                                    onCheckedChange={(checked) =>
                                                        setPendingCampaignColumns(prev => ({ ...prev, [column.key]: !!checked }))
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`camp-col-${column.key}`}
                                                    className="text-sm font-normal cursor-pointer flex-1"
                                                >
                                                    {column.label}
                                                </Label>
                                            </div>
                                        ))}
                                </div>
                                <div className="p-2 border-t mt-1">
                                    <Button
                                        className="w-full"
                                        size="sm"
                                        onClick={() => {
                                            setVisibleCampaignColumns(pendingCampaignColumns);
                                            localStorage.setItem("customer-campaign-table-columns", JSON.stringify(pendingCampaignColumns));
                                            setIsCampaignColumnDropdownOpen(false);
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Show</span>
                                <select
                                    className="rounded-md border px-1.5 py-1 bg-white"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    {[10, 25, 50, 100].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1 border-l pl-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Prev
                                </Button>
                                <span className="font-semibold bg-white px-2 py-1 rounded border tabular-nums">{page}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <CampaignTable
                    campaigns={paginatedCampaigns}
                    destinations={customer.destinations}
                    onEdit={(id) => { setEditingCampaignId(id); setIsCampaignDialogOpen(true); }}
                    onDelete={(id, name) => setCampaignToDelete({ id, name })}
                    onToggleStatus={toggleCampaignStatus}
                    onViewLeads={(id, name) => setSelectedCampaignForLeads({ id, name })}
                    onViewMetrics={(id, name) => setSelectedCampaignForMetrics({ id, name })}
                    canEdit={canEditCampaign}
                    canDelete={canDeleteCampaign}
                    visibleColumns={visibleCampaignColumns}
                />
            </div>

            <SourceLeadsSheet
                open={!!selectedCustomerForLeads}
                onOpenChange={(open) => !open && setSelectedCustomerForLeads(null)}
                customerId={selectedCustomerForLeads}
                title={customer.name}
            />

            <SourceLeadsSheet
                open={!!selectedCampaignForLeads}
                onOpenChange={(open) => !open && setSelectedCampaignForLeads(null)}
                campaignId={selectedCampaignForLeads?.id || null}
                title={selectedCampaignForLeads?.name}
            />

            <PerformanceSheet
                open={!!selectedCustomerForMetrics}
                onOpenChange={(open) => !open && setSelectedCustomerForMetrics(null)}
                customerId={selectedCustomerForMetrics}
                entityName={customer.name}
            />

            <PerformanceSheet
                open={!!selectedCampaignForMetrics}
                onOpenChange={(open) => !open && setSelectedCampaignForMetrics(null)}
                customerId={customer.id}
                campaignId={selectedCampaignForMetrics?.id || null}
                entityName={selectedCampaignForMetrics?.name}
            />
        </div>
    );
}
