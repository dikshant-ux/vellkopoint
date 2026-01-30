"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, Boxes, Activity, Globe, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [stats, setStats] = useState({
    total_vendors: 0,
    active_sources: 0,
    total_customers: 0,
    active_campaigns: 0,
    events_period: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch stats immediately on mount
    fetchStats();

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchStats();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/stats");
      setStats(res.data);
      setLastUpdated(new Date());
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        console.warn("Analytics access denied: Missing permission");
      } else {
        console.error("Failed to fetch stats", error);
      }
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "Total Vendors",
      value: stats.total_vendors,
      icon: Boxes,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Customers",
      value: stats.total_customers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Active Sources",
      value: stats.active_sources,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Active Campaigns",
      value: stats.active_campaigns,
      icon: Send,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Events (24h)",
      value: stats.events_period,
      icon: Globe,
      color: "text-slate-600",
      bgColor: "bg-slate-50"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your data routing platform.</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{card.title}</h3>
                <p className="text-3xl font-bold mt-2 tabular-nums">{card.value}</p>
              </div>
              <div className={`${card.bgColor} ${card.color} p-2.5 rounded-lg`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions or Feed could go here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="bg-white p-8 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Boxes className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Ingest New Data</h3>
            <p className="text-sm text-muted-foreground">Configure sources to start receiving leads from your vendors.</p>
          </div>
          <a href="/vendors" className="text-blue-600 font-semibold hover:underline">Manage Vendors →</a>
        </div>

        <div className="bg-white p-8 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-purple-100 p-4 rounded-full">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Route to Customers</h3>
            <p className="text-sm text-muted-foreground">Define campaigns and outbound mapping to deliver leads to buyers.</p>
          </div>
          <a href="/customers" className="text-purple-600 font-semibold hover:underline">Manage Customers →</a>
        </div>
      </div>
    </div>
  );
}
