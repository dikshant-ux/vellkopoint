"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronRight } from "lucide-react";

gsap.registerPlugin(useGSAP);

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from(".hero-fade", {
      y: 80,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
    });

    gsap.from(".lead-dot", {
      x: -200,
      opacity: 0,
      duration: 2,
      ease: "power2.inOut",
      stagger: 0.4,
      repeat: -1,
    });
  }, { scope: container });

  return (
    <section
      ref={container}
      className="relative pt-40 lg:pt-26 pb-32 overflow-hidden"
    >
      {/* 🌌 Gradient Mesh Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[140px]" />
        <div className="absolute right-[-200px] bottom-[-100px] h-[500px] w-[700px] rounded-full bg-blue-600/20 blur-[140px]" />
      </div>

      <div className="container mx-auto px-6 text-center">

        {/* Badge */}
        <div className="hero-fade inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-purple-300 mb-8">
          ⚡ v2.0 is live
        </div>

        {/* HEADLINE */}
        <h1 className="hero-fade text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white leading-[1.05] max-w-5xl mx-auto">
          Route, Qualify & Deliver Leads  
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400">
            In Under 100ms.
          </span>
        </h1>

        {/* SUBTEXT */}
        <p className="hero-fade mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
          Stop losing high-value opportunities to slow distribution.
          VellkoPoint intelligently matches every lead with the buyer most
          likely to convert — instantly.
        </p>

        {/* CTA */}
        <div className="hero-fade mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="h-14 px-8 rounded-full bg-white text-black hover:bg-gray-200 text-lg font-semibold transition hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.25)]">
            Start Free Trial
          </Button>

          <Button
            variant="outline"
            className="h-14 px-8 rounded-full border-white/20 text-white hover:bg-white/10 text-lg"
          >
            Book Demo <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

       

        {/* 🔥 PRODUCT VISUAL */}
        <div className="hero-fade relative mt-24 max-w-6xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-xl shadow-[0_60px_160px_rgba(80,70,255,0.35)] p-8">

          {/* floating KPI cards */}
          <div className="hidden lg:block absolute -top-6 left-10 bg-black/60 border border-white/10 rounded-xl px-4 py-2 backdrop-blur">
            ⚡ Decision: 87ms
          </div>

          <div className="hidden lg:block absolute -bottom-6 right-10 bg-black/60 border border-white/10 rounded-xl px-4 py-2 backdrop-blur">
            📈 Revenue Lift: +32%
          </div>

          {/* pipeline */}
          <div className="grid grid-cols-4 gap-6 text-left">
            {["Incoming Leads", "AI Qualification", "Smart Routing", "Buyer Delivery"].map((step, i) => (
              <div
                key={i}
                className="relative bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
              >
                <p className="text-gray-300 text-sm mb-3">{step}</p>

                <div className="space-y-2">
                  <div className="lead-dot h-2 bg-purple-400 rounded w-3/4" />
                  <div className="lead-dot h-2 bg-blue-400 rounded w-1/2" />
                  <div className="lead-dot h-2 bg-indigo-400 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
