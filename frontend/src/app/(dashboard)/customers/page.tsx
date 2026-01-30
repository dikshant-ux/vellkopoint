"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog";
import { CustomerTable } from "@/components/customers/customer-table";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { SourceLeadsSheet } from "@/components/leads/source-leads-sheet";
import { PerformanceSheet } from "@/components/system/performance-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";

interface StatSet {
    assigned: number;
    delivered: number;
    rejected: number;
}

interface Customer {
    id: string;
    readable_id?: string;
    name: string;
    status: string;
    stats: {
        today: StatSet;
        yesterday: StatSet;
        last_week: StatSet;
        last_month: StatSet;
        ninety_days: StatSet;
        six_months: StatSet;
        last_year: StatSet;
        all_time: StatSet;
    };
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [search, setSearch] = useState("");
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
    const [selectedCustomerForLeads, setSelectedCustomerForLeads] = useState<{ id: string; name: string } | null>(null);
    const [selectedCustomerForMetrics, setSelectedCustomerForMetrics] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Permission Checks
    const isOwner = user?.role === "owner";
    const canCreate = isOwner || user?.permissions?.includes(Permission.CREATE_CUSTOMERS);
    const canEdit = isOwner || user?.permissions?.includes(Permission.EDIT_CUSTOMERS); // Passed to table for edit links
    const canDelete = isOwner || user?.permissions?.includes(Permission.DELETE_CUSTOMERS);

    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        fetchCustomers();
    }, [debouncedSearch]); // Using debounced search for API calls

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/customers/stats", {
                params: { search: debouncedSearch || undefined }
            });
            setCustomers(res.data);
        } catch (error) {
            console.error("Failed to fetch customers stats", error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const createCustomer = async () => {
        if (!newCustomerName) return;
        try {
            await api.post("/customers/", { name: newCustomerName });
            setNewCustomerName("");
            setIsDialogOpen(false);
            fetchCustomers();
        } catch (error) {
            console.error("Failed to create customer", error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string, name: string) => {
        try {
            const nextStatus = currentStatus === "enabled" ? "disabled" : "enabled";
            await api.put(`/customers/${id}/status`, null, { params: { status: nextStatus } });
            fetchCustomers();
        } catch (error) {
            console.error("Failed to toggle status", error);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!customerToDelete) return;
        try {
            await api.delete(`/customers/${customerToDelete.id}`);
            setCustomerToDelete(null);
            fetchCustomers();
        } catch (error) {
            console.error("Failed to delete customer", error);
        }
    };

    // Since the stats endpoint is currently unpaginated (MVPs), 
    // we handle simple page/pageSize slicing on client if needed, 
    // or just show all for now.
    const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));

    return (
        <div className="space-y-6">
            <DeleteConfirmation
                open={!!customerToDelete}
                onOpenChange={(open) => !open && setCustomerToDelete(null)}
                title="Delete Customer"
                description={`Are you sure you want to delete "${customerToDelete?.name}"? This will permanently remove the customer, all their campaigns, and destinations.`}
                onConfirm={handleDeleteConfirm}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Customers</h1>
                    <p className="text-muted-foreground mt-1">Real-time performance and delivery metrics.</p>
                </div>
                {canCreate && (
                    <CustomerCreateDialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        customerName={newCustomerName}
                        onCustomerNameChange={setNewCustomerName}
                        onCreate={createCustomer}
                    />
                )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b bg-slate-50/50">
                    <div className="flex items-center gap-4">
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

                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <span>Show</span>
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
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </Button>
                            <span className="font-medium bg-white px-2 py-0.5 rounded border">{page}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <CustomerTable
                        customers={paginatedCustomers}
                        onToggleStatus={toggleStatus}
                        onDelete={(id, name) => setCustomerToDelete({ id, name })}
                        onViewLeads={(id, name) => setSelectedCustomerForLeads({ id, name })}
                        onViewMetrics={(id, name) => setSelectedCustomerForMetrics({ id, name })}
                        isLoading={loading}
                        canEdit={canEdit}
                        canDelete={canDelete}
                    />
                </div>
            </div>

            <SourceLeadsSheet
                open={!!selectedCustomerForLeads}
                onOpenChange={(open) => !open && setSelectedCustomerForLeads(null)}
                customerId={selectedCustomerForLeads?.id || null}
                title={selectedCustomerForLeads?.name}
            />

            <PerformanceSheet
                open={!!selectedCustomerForMetrics}
                onOpenChange={(open) => !open && setSelectedCustomerForMetrics(null)}
                customerId={selectedCustomerForMetrics?.id || null}
                entityName={selectedCustomerForMetrics?.name}
            />
        </div>
    );
}
