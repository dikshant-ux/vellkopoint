"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { format, subDays, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface PerformanceSheetProps {
    vendorId?: string | null;
    sourceId?: string | null;
    customerId?: string | null;
    campaignId?: string | null;
    entityName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface DailyStats {
    date: string;
    leads?: number;
    duplicates?: number;
    delivered?: number;
    failed?: number;
}

export function PerformanceSheet({ vendorId, sourceId, customerId, campaignId, entityName, open, onOpenChange }: PerformanceSheetProps) {
    const [data, setData] = useState<DailyStats[]>([]);
    const [loading, setLoading] = useState(false);

    // Default range: Last 30 days
    const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());

    const entityId = vendorId || sourceId || customerId || campaignId;
    const entityType = vendorId ? "vendor" : sourceId ? "source" : customerId ? "customer" : "campaign";
    const isCustomerOrCampaign = customerId || campaignId;

    useEffect(() => {
        if (open && entityId) {
            fetchStats();
        }
    }, [open, entityId, startDate, endDate]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let endpoint = "";

            if (vendorId) {
                endpoint = `/vendors/${vendorId}/history`;
            } else if (sourceId) {
                endpoint = `/sources/${sourceId}/history`;
            } else if (customerId && campaignId) {
                endpoint = `/customers/${customerId}/campaigns/${campaignId}/history`;
            } else if (customerId) {
                endpoint = `/customers/${customerId}/history`;
            }

            const res = await api.get(endpoint, {
                params: {
                    start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                    end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined
                }
            });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch history stats", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[800px] sm:max-w-[800px] flex flex-col h-full p-0">
                <div className="flex-1 overflow-y-auto p-6 pb-20">
                    <SheetHeader className="mb-6 space-y-4">
                        <div>
                            <SheetTitle>Performance Metrics {entityName ? `- ${entityName}` : ""}</SheetTitle>
                            <SheetDescription>
                                Analyze {isCustomerOrCampaign ? "delivery performance" : "lead volume and duplicate rates"} over time.
                            </SheetDescription>
                        </div>

                        {/* Date Range Controls */}
                        <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-md border">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">From:</span>
                                <DatePicker
                                    date={startDate}
                                    setDate={setStartDate}
                                    className="w-[180px] bg-white h-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">To:</span>
                                <DatePicker
                                    date={endDate}
                                    setDate={setEndDate}
                                    className="w-[180px] bg-white h-9"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto h-8"
                                onClick={fetchStats}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CalendarIcon className="w-3 h-3 mr-2" />}
                                Refresh
                            </Button>
                        </div>
                    </SheetHeader>

                    {loading && data.length === 0 ? (
                        <div className="flex items-center justify-center p-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-400 border border-dashed rounded-lg bg-slate-50">
                            <p>No data found for the selected range.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Chart Container */}
                            <div className="h-[400px] w-full bg-white p-4 border rounded-md shadow-sm">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={data}
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => format(new Date(val), "MMM d")}
                                            minTickGap={30}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            labelFormatter={(val) => format(new Date(val), "PPP")}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        {isCustomerOrCampaign ? (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="delivered"
                                                    name="Delivered"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="failed"
                                                    name="Failed"
                                                    stroke="#ef4444"
                                                    strokeWidth={2}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="leads"
                                                    name="Leads (Processed)"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="duplicates"
                                                    name="Duplicates"
                                                    stroke="#ef4444"
                                                    strokeWidth={2}
                                                />
                                            </>
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Summary Stats for Range */}
                            <div className="grid grid-cols-2 gap-4">
                                {isCustomerOrCampaign ? (
                                    <>
                                        <div className="p-4 border rounded-md bg-green-50/50">
                                            <div className="text-sm text-green-600 font-medium">Total Delivered (Range)</div>
                                            <div className="text-2xl font-bold text-green-900 mt-1">
                                                {data.reduce((acc, curr) => acc + (curr.delivered || 0), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 border rounded-md bg-red-50/50">
                                            <div className="text-sm text-red-600 font-medium">Total Failed (Range)</div>
                                            <div className="text-2xl font-bold text-red-900 mt-1">
                                                {data.reduce((acc, curr) => acc + (curr.failed || 0), 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 border rounded-md bg-purple-50/50">
                                            <div className="text-sm text-purple-600 font-medium">Total Volume (Range)</div>
                                            <div className="text-2xl font-bold text-purple-900 mt-1">
                                                {data.reduce((acc, curr) => acc + (curr.leads || 0), 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 border rounded-md bg-red-50/50">
                                            <div className="text-sm text-red-600 font-medium">Total Duplicates (Range)</div>
                                            <div className="text-2xl font-bold text-red-900 mt-1">
                                                {data.reduce((acc, curr) => acc + (curr.duplicates || 0), 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
