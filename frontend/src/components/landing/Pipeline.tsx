"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

export default function Pipeline() {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const ctx = gsap.context(() => {

            const svg = document.querySelector("#network-svg");

            if (!svg) return;

            function spawnLead() {

                const lead = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );

                lead.setAttribute("r", "5");
                lead.setAttribute("fill", "#a855f7");
                lead.style.filter = "drop-shadow(0px 0px 8px #a855f7)";

                svg!.appendChild(lead);

                // STEP 1 → Move to core
                gsap.to(lead, {
                    motionPath: {
                        path: "#ingest",
                        align: "#ingest",
                    },
                    duration: 1.2,
                    ease: "power2.in",
                    onComplete: () => routeLead(lead),
                });
            }

            function routeLead(lead: SVGCircleElement) {

                // 🔥 FLASH CORE
                gsap.fromTo(
                    ".core-flash",
                    { opacity: 0 },
                    { opacity: 0.9, duration: 0.2, yoyo: true, repeat: 1 }
                );

                // randomly choose destination
                const outputs = ["#out1", "#out2", "#out3"];
                const chosen = outputs[Math.floor(Math.random() * outputs.length)];

                gsap.to(lead, {
                    fill: "#22d3ee",
                    duration: 0.2,
                });

                gsap.to(lead, {
                    motionPath: {
                        path: chosen,
                        align: chosen,
                    },
                    duration: 1.4,
                    ease: "power1.out",
                    onComplete: () => {
                        gsap.to(lead, {
                            opacity: 0,
                            duration: 0.3,
                            onComplete: () => lead.remove(),
                        });

                        gsap.fromTo(
                            chosen.replace("#out", "#buyer"),
                            { scale: 1 },
                            { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 }
                        );
                    },
                });
            }

            // 🔥 continuous traffic
            gsap.timeline({ repeat: -1 })
                .call(spawnLead)
                .to({}, { duration: 0.45 });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="py-40 bg-[#07070a] relative overflow-hidden"
        >
            <div className="container mx-auto px-6">

                {/* HEADER */}
                <div className="text-center mb-24">
                    <p className="text-purple-400 tracking-[0.35em] text-xs mb-6">
                        REAL-TIME DATA FLOW
                    </p>

                    <h2 className="text-5xl font-semibold text-white mb-6">
                        Sources In. Decisions Made. Revenue Out.
                    </h2>

                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Watch VellkoPoint analyze, qualify, and route every lead in milliseconds.
                    </p>
                </div>

                {/* NETWORK */}
                <div className="relative max-w-7xl mx-auto h-[520px] rounded-[28px]
        border border-white/10 bg-gradient-to-b from-[#0b0b12] to-black overflow-hidden">

                    {/* SVG */}
                    <svg id="network-svg" className="absolute inset-0 w-full h-full">

                        <defs>
                            <linearGradient id="flow">
                                <stop offset="0%" stopColor="transparent" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>

                        {/* INGEST */}
                        <path
                            id="ingest"
                            d="M150 260 C320 260 380 260 480 260"
                            stroke="url(#flow)"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.4"
                        />

                        {/* OUTPUTS */}
                        <path id="out1" d="M520 260 C650 200 720 150 900 150"
                            stroke="url(#flow)" strokeWidth="2" fill="none" opacity="0.4" />

                        <path id="out2" d="M520 260 C650 260 720 260 900 260"
                            stroke="url(#flow)" strokeWidth="2" fill="none" opacity="0.4" />

                        <path id="out3" d="M520 260 C650 320 720 380 900 380"
                            stroke="url(#flow)" strokeWidth="2" fill="none" opacity="0.4" />
                    </svg>

                    {/* CORE */}
                    <div className="absolute left-1/2 top-1/2 w-44 h-44
          -translate-x-1/2 -translate-y-1/2 rounded-full
          bg-black border border-purple-500/40 flex items-center justify-center
          shadow-[0_0_120px_rgba(168,85,247,0.45)]">

                        <div className="core-flash absolute inset-0 rounded-full bg-purple-500/30 blur-2xl opacity-0" />

                        <span className="text-white font-semibold text-center leading-tight">
                            Routing<br />Engine
                        </span>
                    </div>

                    {/* LEFT */}
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 text-gray-400">
                        🌐 Webhooks
                    </div>

                    {/* BUYERS */}
                    <div id="buyer1" className="absolute right-16 top-[120px] text-cyan-400">
                        CRM
                    </div>

                    <div id="buyer2" className="absolute right-16 top-1/2 -translate-y-1/2 text-cyan-400">
                        Buyers
                    </div>

                    <div id="buyer3" className="absolute right-16 bottom-[100px] text-cyan-400">
                        Data Warehouse
                    </div>

                </div>
            </div>
        </section>
    );
}
