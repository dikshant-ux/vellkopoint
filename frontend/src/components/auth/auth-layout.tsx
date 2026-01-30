"use client";

import React from "react";
import { motion } from "framer-motion";
import { Command } from "lucide-react";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-6"
            >
                {/* Brand Logo */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2 text-white">
                        <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Command className="size-6" />
                        </div>
                        <div className="grid flex-1 text-left text-lg leading-tight">
                            <span className="truncate font-semibold tracking-tight">Vellkopoint</span>
                            <span className="truncate text-xs text-blue-200">Data Router</span>
                        </div>
                    </div>
                </div>

                {/* Glass Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
                        <p className="text-slate-400 text-sm">{subtitle}</p>
                    </div>
                    {children}
                </div>
            </motion.div>
        </div>
    );
}
