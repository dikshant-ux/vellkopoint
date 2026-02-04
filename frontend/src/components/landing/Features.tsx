"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Globe, ShieldCheck, Zap, Split, Activity, Database, FileJson, Layers } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
    {
        icon: Zap,
        title: "Real-Time Routing",
        desc: "Process and route leads in < 200ms. Beat competitors to the lead."
    },
    {
        icon: Split,
        title: "Smart Distribution",
        desc: "Round-robin, weighted delivery, or performance-based routing logic."
    },
    {
        icon: ShieldCheck,
        title: "Validation & Hygiene",
        desc: "Automatically verify email, phone, and address data before it hits your CRM."
    },
    {
        icon: Globe,
        title: "Universal API",
        desc: "One API to ingest leads from any source: Facebook, Google, Bing, or TikTok."
    },
    {
        icon: FileJson,
        title: "Format Normalization",
        desc: "Transform messy incoming JSON into clean, standardized payloads."
    },
    {
        icon: Layers,
        title: "Deduplication",
        desc: "Prevent duplicate leads from wasting budget with fuzzy matching."
    },
    {
        icon: Activity,
        title: "Live Monitoring",
        desc: "Watch leads flow through your system in real-time with granular logs."
    },
    {
        icon: Database,
        title: "Data Warehouse Sync",
        desc: "Automatically backup every event to Snowflake, BigQuery, or S3."
    }
];

export default function Features() {
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".feature-card", {
                y: 60,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                }
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section id="features" ref={containerRef} className="py-24 bg-black relative">
            <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />

            <div className="container mx-auto px-6">
                <div className="mb-20 max-w-3xl">
                    <h2 className="text-sm font-semibold text-purple-400 tracking-wider uppercase mb-3">Enterprise Grade</h2>
                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Built for High-Volume <br />
                        Performance Marketing.
                    </h3>
                    <p className="text-gray-400 text-lg">
                        Veelkopoint handles the complexity of lead distribution so you can focus on generating more traffic.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <div key={i} className="feature-card group h-full bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon className="text-purple-400 w-6 h-6" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
