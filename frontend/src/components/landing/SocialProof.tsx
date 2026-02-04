"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function SocialProof() {
    const containerRef = useRef(null);

    useEffect(() => {
        // Simple infinite scroll animation for logos could be added here
        // or just static reveal
    }, []);

    const stats = [
        { label: "Leads Processed Daily", value: "2M+" },
        { label: "Uptime SLA", value: "99.99%" },
        { label: "Average Latency", value: "<150ms" },
        { label: "Revenue Routed", value: "$500M+" }
    ];

    return (
        <section className="py-20 border-y border-white/5 bg-white/[0.02]">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-white mb-2 tabular-nums tracking-tight">
                                {stat.value}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-widest font-medium">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
