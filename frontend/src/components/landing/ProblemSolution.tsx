"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AlertCircle, ArrowDown, CheckCircle, Zap } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function ProblemSolution() {
    const sectionRef = useRef(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const cards = cardRefs.current;

        gsap.fromTo(cards,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 70%",
                    end: "bottom 80%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    }, []);

    return (
        <section ref={sectionRef} className="py-24 relative bg-black">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-6">
                        The Old Way of Routing Leads is Broken.
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Manual CSV uploads, slow API integrations, and leaked revenue.
                        Stop relying on spreadsheets to run your business.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto">
                    {/* Problem Card */}
                    <div ref={el => { cardRefs.current[0] = el }} className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 relative overflow-hidden group hover:border-red-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <AlertCircle className="text-red-500 w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-red-400 mb-6">The Problem</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-400">
                                <span className="text-red-500 mt-1">✕</span>
                                <span><strong>5+ Minute Delays</strong> in lead delivery kill conversion rates.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-400">
                                <span className="text-red-500 mt-1">✕</span>
                                <span>Manual <strong>CSV uploads</strong> prone to human error.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-400">
                                <span className="text-red-500 mt-1">✕</span>
                                <span>No real-time validation = <strong>paying for bad data</strong>.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-400">
                                <span className="text-red-500 mt-1">✕</span>
                                <span>Engineering resources wasted on custom API builds.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Solution Card */}
                    <div ref={el => { cardRefs.current[1] = el }} className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/40 transition-colors shadow-2xl shadow-purple-500/10">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <Zap className="text-purple-400 w-12 h-12" />
                        </div>
                        <div className="absolute inset-0 bg-purple-500/5 blur-3xl -z-10 group-hover:bg-purple-500/10 transition-colors" />
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-purple-400">The Solution</span>
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-300">
                                <CheckCircle className="text-green-400 w-5 h-5 mt-0.5 shrink-0" />
                                <span><strong>Sub-second routing</strong> to any CRM or endpoint.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-300">
                                <CheckCircle className="text-green-400 w-5 h-5 mt-0.5 shrink-0" />
                                <span>Automated <strong>format normalization</strong> & validation.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-300">
                                <CheckCircle className="text-green-400 w-5 h-5 mt-0.5 shrink-0" />
                                <span>Smart <strong>Failover & Retries</strong> ensure 100% delivery.</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-300">
                                <CheckCircle className="text-green-400 w-5 h-5 mt-0.5 shrink-0" />
                                <span><strong>No-code rules engine</strong> for complex logic.</span>
                            </li>
                        </ul>

                        <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Average Conversion Lift</div>
                            <div className="text-3xl font-bold text-green-400">+45%</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
