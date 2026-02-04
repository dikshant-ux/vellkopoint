"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import api from "@/lib/api";
import { Boxes, Send, Users, Activity, ExternalLink } from "lucide-react";

interface Entity {
    id: string;
    name: string;
    _id?: string;
}

interface Source {
    id: string;
    name: string;
    status: "enabled" | "disabled" | "active" | "inactive";
}

interface Vendor extends Entity {
    sources: Source[];
}

interface Campaign extends Entity {
    source_ids: string[];
    destination_id: string;
}

interface Customer extends Entity {
    destinations: string[]; // destination IDs
}

interface Destination extends Entity {
    type: string;
}

export function ConnectionGraph() {
    const [data, setData] = useState<{
        vendors: Vendor[];
        campaigns: Campaign[];
        customers: Customer[];
        destinations: Destination[];
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [hoveredPath, setHoveredPath] = useState<{
        sourceId?: string,
        customerId?: string,
        campaignId?: string,
        destinationId?: string
    } | null>(null);

    // Refs for calculating positions
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number, height: number } }>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/analytics/connections");
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch connection data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const updatePositions = () => {
        if (!containerRef.current) return;

        const newPositions: { [key: string]: { x: number, y: number, height: number } } = {};
        const containerRect = containerRef.current.getBoundingClientRect();

        const registerPosition = (id: string) => {
            const el = document.getElementById(`node-${id}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                newPositions[id] = {
                    x: rect.left - containerRect.left,
                    y: rect.top - containerRect.top + (rect.height / 2),
                    height: rect.height
                };
            }
        };

        data?.vendors.forEach(v => v.sources.forEach(s => registerPosition(s.id)));
        data?.campaigns.forEach(c => registerPosition(c.id || c._id!));
        data?.customers.forEach(c => registerPosition(c.id || c._id!));
        data?.destinations.forEach(d => registerPosition(d.id || d._id!));

        setPositions(newPositions);
    };

    useEffect(() => {
        if (!loading && data) {
            setTimeout(updatePositions, 100);
            window.addEventListener('resize', updatePositions);
            return () => window.removeEventListener('resize', updatePositions);
        }
    }, [loading, data]);

    // --- LOGIC ---
    const isSourceActive = (s: Source) => s.status === 'enabled' || s.status === 'active';

    // Compute active set of IDs based on hover
    const activeIds = useMemo(() => {
        const active = {
            sources: new Set<string>(),
            campaigns: new Set<string>(),
            customers: new Set<string>(),
            destinations: new Set<string>()
        };

        if (!hoveredPath || !data) return active;

        const { sourceId, campaignId, customerId, destinationId } = hoveredPath;
        const allSources = data.vendors.flatMap(v => v.sources);

        // CASE 1: HOVER SOURCE
        if (sourceId) {
            active.sources.add(sourceId);

            // 1. Find Campaigns using this source
            const connectedCampaigns = data.campaigns.filter(c =>
                c.source_ids.includes(sourceId) || c.source_ids.length === 0
            );
            connectedCampaigns.forEach(c => active.campaigns.add(c.id || c._id!));

            // 2. Find Destinations from those campaigns
            const connectedDestIds = new Set(connectedCampaigns.map(c => c.destination_id));
            connectedDestIds.forEach(id => active.destinations.add(id));

            // 3. Find Customers owning those destinations
            data.customers.forEach(cust => {
                if (cust.destinations.some(d => connectedDestIds.has(d))) {
                    active.customers.add(cust.id || cust._id!);
                }
            });
        }

        // CASE 2: HOVER CUSTOMER
        else if (customerId) {
            active.customers.add(customerId);

            // 1. Get all customer potential destinations
            const targetCustomer = data.customers.find(c => (c.id || c._id) === customerId);
            const customerDestIds = targetCustomer ? targetCustomer.destinations : [];

            // 2. Find Campaigns actively using these destinations
            const connectedCampaigns = data.campaigns.filter(c => customerDestIds.includes(c.destination_id));

            // 3. Highlight only the USED destinations and connected campaigns
            connectedCampaigns.forEach(c => {
                active.campaigns.add(c.id || c._id!);
                active.destinations.add(c.destination_id);
            });

            // 4. Find Sources feeding these campaigns
            connectedCampaigns.forEach(c => {
                if (c.source_ids.length === 0) {
                    allSources.forEach(s => active.sources.add(s.id));
                } else {
                    c.source_ids.forEach(sid => active.sources.add(sid));
                }
            });
        }

        // CASE 3: HOVER CAMPAIGN
        else if (campaignId) {
            active.campaigns.add(campaignId);
            const campaign = data.campaigns.find(c => (c.id || c._id) === campaignId);

            if (campaign) {
                // 1. Destinations
                active.destinations.add(campaign.destination_id);

                // 2. Sources
                if (campaign.source_ids.length === 0) {
                    allSources.forEach(s => active.sources.add(s.id));
                } else {
                    campaign.source_ids.forEach(sid => active.sources.add(sid));
                }

                // 3. Customer
                const customer = data.customers.find(c => c.destinations.includes(campaign.destination_id));
                if (customer) active.customers.add(customer.id || customer._id!);
            }
        }

        // CASE 4: HOVER DESTINATION
        else if (destinationId) {
            active.destinations.add(destinationId);

            // 1. Campaigns pointing here
            const connectedCampaigns = data.campaigns.filter(c => c.destination_id === destinationId);
            connectedCampaigns.forEach(c => active.campaigns.add(c.id || c._id!));

            // 2. Sources feeding these campaigns
            connectedCampaigns.forEach(c => {
                if (c.source_ids.length === 0) {
                    allSources.forEach(s => active.sources.add(s.id));
                } else {
                    c.source_ids.forEach(sid => active.sources.add(sid));
                }
            });

            // 3. Customer owning this destination
            const customer = data.customers.find(c => c.destinations.includes(destinationId));
            if (customer) active.customers.add(customer.id || customer._id!);
        }

        return active;
    }, [hoveredPath, data]);

    // Calculate connections with the flow: Source -> Customer -> Campaign -> Destination
    const connections = useMemo(() => {
        const lines: React.ReactNode[] = [];
        if (!data || Object.keys(positions).length === 0) return lines;

        const sourceNodes = data.vendors.flatMap(v => v.sources);

        // Helper: Find which customers a source flows to
        // Logic: Source -> Campaign -> Destination -> Customer
        const getTargetCustomers = (sourceId: string) => {
            // 1. Find campaigns for this source
            const relCampaigns = data.campaigns.filter(c => c.source_ids.length === 0 || c.source_ids.includes(sourceId));
            // 2. Find destinations for these campaigns
            const relDestIds = relCampaigns.map(c => c.destination_id);
            // 3. Find customers owning these destinations
            return data.customers.filter(cust => cust.destinations.some(d => relDestIds.includes(d)));
        };

        // Helper: Find which campaigns a customer uses
        // Logic: Customer -> Destination -> Campaign
        const getCustomerCampaigns = (customer: Customer) => {
            // Campaigns that output to one of the customer's destinations
            return data.campaigns.filter(c => customer.destinations.includes(c.destination_id));
        }

        // PATH 1: Source -> Customer
        sourceNodes.forEach(source => {
            const start = positions[source.id];
            if (!start) return;

            const targets = getTargetCustomers(source.id);
            targets.forEach(cust => {
                const custId = cust.id || cust._id!;
                const end = positions[custId];
                if (!end) return;

                const active = activeIds.sources.has(source.id) && activeIds.customers.has(custId);
                const isDimmed = hoveredPath && !active;

                lines.push(
                    <path
                        key={`s-c-${source.id}-${custId}`}
                        d={`M ${start.x + 180} ${start.y} C ${start.x + 220} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`}
                        fill="none"
                        stroke={active ? "#10b981" : "#e5e7eb"}
                        strokeWidth={active ? 2 : 1}
                        className="transition-all duration-300"
                        style={{ opacity: isDimmed ? 0.1 : 1 }}
                    />
                );
            });
        });

        // PATH 2: Customer -> Campaign
        data.customers.forEach(cust => {
            const custId = cust.id || cust._id!;
            const start = positions[custId];
            if (!start) return;

            const custCampaigns = getCustomerCampaigns(cust);
            custCampaigns.forEach(camp => {
                const campId = camp.id || camp._id!;
                const end = positions[campId];
                if (!end) return;

                const active = activeIds.customers.has(custId) && activeIds.campaigns.has(campId);
                const isDimmed = hoveredPath && !active;

                lines.push(
                    <path
                        key={`c-cam-${custId}-${campId}`}
                        d={`M ${start.x + 180} ${start.y} C ${start.x + 220} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`}
                        fill="none"
                        stroke={active ? "#8b5cf6" : "#e5e7eb"}
                        strokeWidth={active ? 2 : 1}
                        className="transition-all duration-300"
                        style={{ opacity: isDimmed ? 0.1 : 1 }}
                    />
                );
            });
        });

        // PATH 3: Campaign -> Destination
        data.campaigns.forEach(camp => {
            const campId = camp.id || camp._id!;
            const start = positions[campId];
            if (!start) return;

            const destId = camp.destination_id;
            const end = positions[destId];
            // Destination might not be rendered if filtered out? Assuming all dests are rendered
            if (!end) return;

            const active = activeIds.campaigns.has(campId) && activeIds.destinations.has(destId);
            const isDimmed = hoveredPath && !active;

            lines.push(
                <path
                    key={`cam-d-${campId}-${destId}`}
                    d={`M ${start.x + 180} ${start.y} C ${start.x + 220} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`}
                    fill="none"
                    stroke={active ? "#f59e0b" : "#e5e7eb"}
                    strokeWidth={active ? 2 : 1}
                    className="transition-all duration-300"
                    style={{ opacity: isDimmed ? 0.1 : 1 }}
                />
            );
        });

        return lines;
    }, [data, positions, hoveredPath, activeIds]);

    if (loading) return <div className="h-64 animate-pulse bg-gray-50 rounded-xl" />;
    if (!data) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Live Data Flow</h3>
                <div className="flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Source</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500" /> Customer</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Campaign</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Destination</div>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                <div className="relative min-h-[400px] min-w-[1024px]" ref={containerRef}>

                    {/* SVG LAYER */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {connections}
                    </svg>

                    <div className="grid grid-cols-4 gap-12 relative z-20">

                        {/* 1. SOURCES */}
                        <div className="space-y-6">
                            {data.vendors.map(vendor => (
                                <div key={vendor.id || vendor._id} className="border rounded-lg bg-slate-50/50 p-3 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Boxes className="w-4 h-4 text-slate-500" />
                                        <span className="font-semibold text-sm text-slate-700">{vendor.name}</span>
                                    </div>
                                    <div className="space-y-2 pl-2">
                                        {vendor.sources.map(source => (
                                            <div
                                                id={`node-${source.id}`}
                                                key={source.id}
                                                onMouseEnter={() => setHoveredPath({ sourceId: source.id })}
                                                onMouseLeave={() => setHoveredPath(null)}
                                                className={`
                                        group flex items-center justify-between p-2 rounded border bg-white text-xs cursor-default transition-all
                                        ${activeIds.sources.has(source.id) ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-sm opacity-100' : 'border-slate-200 hover:border-emerald-300'}
                                        ${hoveredPath && !activeIds.sources.has(source.id) ? 'opacity-40' : ''}
                                    `}
                                            >
                                                <span className="font-medium truncate max-w-[120px]">{source.name}</span>
                                                <div className={`w-2 h-2 rounded-full ${isSourceActive(source) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {data.vendors.length === 0 && <div className="text-sm text-muted-foreground">No vendors found.</div>}
                        </div>

                        {/* 2. CUSTOMERS */}
                        <div className="space-y-4 pt-4">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">Customers</h4>
                            {data.customers.map(cust => {
                                const custId = cust.id || cust._id!;
                                return (
                                    <div
                                        id={`node-${custId}`}
                                        key={custId}
                                        onMouseEnter={() => setHoveredPath({ customerId: custId })}
                                        onMouseLeave={() => setHoveredPath(null)}
                                        className={`
                                p-3 rounded-lg border bg-white flex items-center gap-3 shadow-sm transition-all
                                ${activeIds.customers.has(custId) ? 'border-purple-500 ring-1 ring-purple-500 opacity-100' : 'border-slate-200'}
                                ${hoveredPath && !activeIds.customers.has(custId) ? 'opacity-40' : ''}
                            `}
                                    >
                                        <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                            <Users className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="text-sm font-medium">{cust.name}</span>
                                    </div>
                                )
                            })}
                            {data.customers.length === 0 && <div className="text-sm text-muted-foreground text-center">No customers found.</div>}
                        </div>

                        {/* 3. CAMPAIGNS */}
                        <div className="space-y-4 pt-4">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">Campaigns</h4>
                            {data.campaigns.map(camp => {
                                const campId = camp.id || camp._id!;
                                return (
                                    <div
                                        id={`node-${campId}`}
                                        key={campId}
                                        onMouseEnter={() => setHoveredPath({ campaignId: campId })}
                                        onMouseLeave={() => setHoveredPath(null)}
                                        className={`
                                p-3 rounded-lg border bg-white flex items-center gap-3 shadow-sm transition-all
                                ${activeIds.campaigns.has(campId) ? 'border-blue-500 ring-1 ring-blue-500 opacity-100' : 'border-slate-200'}
                                ${hoveredPath && !activeIds.campaigns.has(campId) ? 'opacity-40' : ''}
                            `}
                                    >
                                        <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="text-sm font-medium">{camp.name}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* 4. DESTINATIONS */}
                        <div className="space-y-4 pt-4">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right mb-4">Endpoints</h4>
                            {data.destinations.map(dest => {
                                const destId = dest.id || dest._id!;
                                return (
                                    <div
                                        id={`node-${destId}`}
                                        key={destId}
                                        onMouseEnter={() => setHoveredPath({ destinationId: destId })}
                                        onMouseLeave={() => setHoveredPath(null)}
                                        className={`
                                p-3 rounded-lg border bg-white flex items-center justify-end gap-3 shadow-sm transition-all text-right
                                ${activeIds.destinations.has(destId) ? 'border-orange-500 ring-1 ring-orange-500 opacity-100' : 'border-slate-200'}
                                ${hoveredPath && !activeIds.destinations.has(destId) ? 'opacity-40' : ''}
                            `}
                                    >
                                        <div>
                                            <div className="text-sm font-medium">{dest.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{dest.type}</div>
                                        </div>
                                        <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center shrink-0">
                                            <ExternalLink className="w-4 h-4 text-orange-600" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
