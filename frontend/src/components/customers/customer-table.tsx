"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Trash2, BarChart3 } from "lucide-react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

interface StatSet {
    assigned: number;
    delivered: number;
    rejected: number;
}

interface Customer {
    id: string;
    _id?: string;
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

interface CustomerTableProps {
    customers: Customer[];
    onToggleStatus: (id: string, currentStatus: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    onViewLeads?: (id: string, name: string) => void;
    onViewMetrics?: (id: string, name: string) => void;
    isLoading?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function CustomerTable({ customers, onToggleStatus, onDelete, onViewLeads, onViewMetrics, isLoading, canEdit = true, canDelete = true }: CustomerTableProps) {
    const router = useRouter();

    if (isLoading) {
        return (
            <Table className="min-w-[1600px] text-[13px]">
                <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                        <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Cust ID</TableHead>
                        <TableHead className="w-[200px] text-slate-900 font-bold whitespace-nowrap">Customer Name</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l bg-slate-100/30">Assigned Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Delivered Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Rejected Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l">Delivered Yesterday</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Week</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Month</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered 90 Days</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered 6 Months</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Year</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-r">Delivered All Time</TableHead>
                        <TableHead className="w-[100px] text-center text-slate-900 font-bold">Status</TableHead>
                        <TableHead className="w-[80px] text-right text-slate-900 font-bold">Options</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-b">
                            <TableCell className="py-3"><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell className="border-l"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell className="border-l"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell className="border-r"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[50px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[20px] ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Table className="min-w-[1600px] text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                    <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Cust ID</TableHead>
                    <TableHead className="w-[200px] text-slate-900 font-bold whitespace-nowrap">Customer Name</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l bg-slate-100/30">Assigned Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Delivered Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Rejected Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l">Delivered Yesterday</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Week</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Month</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered 90 Days</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered 6 Months</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Last Year</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-r">Delivered All Time</TableHead>
                    <TableHead className="w-[100px] text-center text-slate-900 font-bold">Status</TableHead>
                    <TableHead className="w-[80px] text-right text-slate-900 font-bold">Options</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {customers.map((c, index) => (
                    <TableRow
                        key={c.id || c._id || index}
                        className="cursor-pointer hover:bg-blue-50/30 group transition-colors border-b"
                        onClick={() => router.push(`/customers/${c.id || c._id}`)}
                    >
                        <TableCell className="font-mono font-bold text-slate-900 py-3">
                            {c.readable_id || (c.id || c._id)?.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{c.name}</TableCell>

                        {/* Highlights for Today */}
                        <TableCell className="text-center tabular-nums font-semibold border-l bg-slate-100/10">{c.stats.today.assigned.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums font-bold text-blue-600 bg-slate-100/10">{c.stats.today.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums font-semibold text-red-500 bg-slate-100/10">{c.stats.today.rejected.toLocaleString()}</TableCell>

                        {/* Historical */}
                        <TableCell className="text-center tabular-nums border-l">{c.stats.yesterday.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.stats.last_week.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.stats.last_month.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.stats.ninety_days.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.stats.six_months.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.stats.last_year.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-center tabular-nums font-bold border-r bg-slate-50/30">{c.stats.all_time.delivered.toLocaleString()}</TableCell>

                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={c.status === "enabled"}
                                    className="scale-75"
                                    onCheckedChange={() => onToggleStatus((c.id || c._id) as string, c.status, c.name)}
                                    disabled={!canEdit}
                                />
                                <span className={`text-[11px] font-medium hidden xl:inline-block ${c.status === "enabled" ? "text-green-600" : "text-muted-foreground"}`}>
                                    {c.status === "enabled" ? "Active" : "Disabled"}
                                </span>
                            </div>
                        </TableCell>

                        <TableCell className="text-right">
                            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0  group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => router.push(`/customers/${c.id || c._id}`)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                        </DropdownMenuItem>
                                        {onViewLeads && (
                                            <DropdownMenuItem onClick={() => onViewLeads?.((c.id || c._id) as string, c.name)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Leads
                                            </DropdownMenuItem>
                                        )}
                                        {onViewMetrics && (
                                            <DropdownMenuItem onClick={() => onViewMetrics?.((c.id || c._id) as string, c.name)}>
                                                <BarChart3 className="mr-2 h-4 w-4" />
                                                View Metrics
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete((c.id || c._id) as string, c.name)}
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
                ))}
                {customers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={13} className="text-center py-20 text-muted-foreground bg-slate-50/30">
                            No customers found matching your criteria.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
