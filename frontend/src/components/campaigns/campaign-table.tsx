"use client";

import { MoreHorizontal, Pencil, Trash2, Eye, BarChart3 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface StatSet {
    assigned: number;
    delivered: number;
    rejected: number;
}

interface Campaign {
    id: string;
    _id?: string;
    readable_id?: string;
    name: string;
    description?: string;
    destination_id: string;
    config: {
        status: string;
        priority: number;
        weight: number;
    };
    stats?: {
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

interface CampaignTableProps {
    campaigns: Campaign[];
    destinations: any[];
    onEdit: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    onToggleStatus: (id: string, currentStatus: string, name: string) => void;
    onViewLeads?: (id: string, name: string) => void;
    onViewMetrics?: (id: string, name: string) => void;
    isLoading?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function CampaignTable({ campaigns, destinations, onEdit, onDelete, onToggleStatus, onViewLeads, onViewMetrics, isLoading, canEdit = true, canDelete = true }: CampaignTableProps) {
    const getDestinationName = (id: string) => {
        const d = destinations.find(dest => dest.id === id);
        return d ? d.name : "Unknown Destination";
    };

    if (isLoading) {
        return (
            <Table className="min-w-[1400px] text-[13px]">
                <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                        <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Camp ID</TableHead>
                        <TableHead className="w-[180px] text-slate-900 font-bold whitespace-nowrap">Campaign Name</TableHead>
                        <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Target Destination</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l bg-slate-100/30">Assigned Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Delivered Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Rejected Today</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l">Delivered Yest.</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Week</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-r">Delivered Total</TableHead>
                        <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap">Priority</TableHead>
                        <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap mr-4">Weight (%)</TableHead>
                        <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap">Options</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i} className="border-b">
                            <TableCell className="py-3"><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell className="border-l"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell className="border-l"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell className="border-r"><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[50px] mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[20px] ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Table className="min-w-[1400px] text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                    <TableHead className="w-[100px] py-3 text-slate-900 font-bold whitespace-nowrap">Camp ID</TableHead>
                    <TableHead className="w-[180px] text-slate-900 font-bold whitespace-nowrap">Campaign Name</TableHead>
                    <TableHead className="w-[150px] text-slate-900 font-bold whitespace-nowrap">Target Destination</TableHead>

                    {/* Analytics Headers */}
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l bg-slate-100/30">Assigned Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Delivered Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 bg-slate-100/30">Rejected Today</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-l">Delivered Yest.</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4">Delivered Week</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap px-4 border-r">Delivered Total</TableHead>

                    <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap">Priority</TableHead>
                    <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap mr-4">Weight (%)</TableHead>
                    <TableHead className="text-center text-slate-900 font-bold whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right text-slate-900 font-bold whitespace-nowrap">Options</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {campaigns.map((c, index) => (
                    <TableRow key={c.id || c._id || index} className="hover:bg-blue-50/30 group transition-colors border-b">
                        <TableCell className="font-mono text-xs font-bold text-slate-900 py-3">
                            {c.readable_id || (c.id || c._id)?.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium text-slate-900">{c.name}</div>
                            {c.description && <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{c.description}</div>}
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="font-normal border-slate-200 bg-slate-50 truncate max-w-[140px]">
                                {getDestinationName(c.destination_id)}
                            </Badge>
                        </TableCell>

                        {/* Analytics Cells */}
                        <TableCell className="text-center tabular-nums font-semibold border-l bg-slate-100/10">
                            {c.stats?.today?.assigned?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-bold text-blue-600 bg-slate-100/10">
                            {c.stats?.today?.delivered?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-semibold text-red-500 bg-slate-100/10">
                            {c.stats?.today?.rejected?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums border-l">
                            {c.stats?.yesterday?.delivered?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                            {c.stats?.last_week?.delivered?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-bold border-r bg-slate-50/30">
                            {c.stats?.all_time?.delivered?.toLocaleString() || 0}
                        </TableCell>

                        <TableCell className="text-right tabular-nums">{c.config.priority}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.config.weight}%</TableCell>
                        <TableCell>
                            <div className="flex items-center justify-center gap-2">
                                <Switch
                                    checked={c.config.status === "enabled"}
                                    className="scale-75"
                                    onCheckedChange={() => onToggleStatus((c.id || c._id) as string, c.config.status, c.name)}
                                    disabled={!canEdit}
                                />
                                <span className={`text-[11px] font-medium hidden xl:inline-block ${c.config.status === "enabled" ? "text-green-600" : "text-muted-foreground"}`}>
                                    {c.config.status === "enabled" ? "Active" : "Off"}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onEdit((c.id || c._id) as string)} disabled={!canEdit}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Mapping & Rules
                                    </DropdownMenuItem>
                                    {onViewLeads && (
                                        <DropdownMenuItem onClick={() => onViewLeads((c.id || c._id) as string, c.name)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Leads
                                        </DropdownMenuItem>
                                    )}
                                    {onViewMetrics && (
                                        <DropdownMenuItem onClick={() => onViewMetrics((c.id || c._id) as string, c.name)}>
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
                        </TableCell>
                    </TableRow>
                ))}
                {campaigns.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={13} className="text-center py-10 text-gray-500">
                            No campaigns configured for this customer.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
