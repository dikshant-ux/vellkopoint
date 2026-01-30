"use client";

import React from "react";
import Image from "next/image";
import { Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthSplitLayoutProps {
    children: React.ReactNode;
    mode: "login" | "signup" | "forgot-password" | "reset-password" | "verify-email";
}

export function AuthSplitLayout({ children, mode }: AuthSplitLayoutProps) {
    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-[#0A0A0B]">
            {/* 
              Desktop Layout:
              - login: Form (Left), Info (Right) -> flex-row
              - signup: Info (Left), Form (Right) -> flex-row-reverse
              
              We use `layout` and `layoutId` to allow Framer Motion to animate the 
              swap of these panels even across route changes.
            */}
            <div className={`hidden lg:flex w-full ${mode === "signup" ? "flex-row-reverse" : "flex-row"}`}>

                {/* Form Section */}
                <motion.div
                    layoutId="auth-form-panel"
                    className="flex w-1/2 items-center justify-center p-12"
                    transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}
                >
                    <div className="w-full max-w-[420px] space-y-8">
                        {/* Mobile/Form-side Header */}
                        <div className="flex flex-col space-y-3 mb-8">
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <h1 className="text-4xl font-bold tracking-tight text-white">
                                    {mode === "login" && "Welcome back"}
                                    {mode === "signup" && "Create an account"}
                                    {mode === "forgot-password" && "Reset Password"}
                                    {mode === "reset-password" && "Set new password"}
                                    {mode === "verify-email" && "Email Verification"}
                                </h1>
                                <p className="text-base text-slate-400 mt-2">
                                    {mode === "login" && "Enter your credentials to access your workspace."}
                                    {mode === "signup" && "Get started with your free account today."}
                                    {mode === "forgot-password" && "Enter your email to receive reset instructions."}
                                    {mode === "reset-password" && "Please choose a strong password for your account."}
                                    {mode === "verify-email" && "Confirm your email address to activate your account."}
                                </p>
                            </motion.div>
                        </div>

                        {children}

                        <p className="px-8 text-center text-sm text-slate-500 mt-8">
                            By continuing, you agree to our{" "}
                            <a href="/terms" className="underline underline-offset-4 hover:text-white transition-colors">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="/privacy" className="underline underline-offset-4 hover:text-white transition-colors">
                                Privacy Policy
                            </a>
                            .
                        </p>
                    </div>
                </motion.div>

                {/* Info/Brand Section */}
                <motion.div
                    layoutId="auth-info-panel"
                    className="flex w-1/2 p-4"
                    transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}
                >
                    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] bg-zinc-900 border border-white/5 p-12 shadow-2xl">
                        {/* Background Effects */}
                        <div className="absolute inset-0 z-0">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                                className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-40 mix-blend-screen"
                            />
                            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-20" />
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <motion.div
                                layoutId="auth-info-brand"
                                className="flex items-center gap-4"
                            >
                                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                                    <Command className="size-6" />
                                </div>
                                <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400">
                                    Vellkopoint
                                </span>
                            </motion.div>

                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="space-y-8 max-w-lg"
                            >
                                <h2 className="text-5xl font-bold tracking-tight text-white leading-[1.1]">
                                    {(mode === "login" || mode === "forgot-password" || mode === "reset-password" || mode === "verify-email")
                                        ? "Data routing infrastructure for the modern enterprise."
                                        : "Start building your data pipelines in minutes."}
                                </h2>
                                <ul className="space-y-4 text-lg text-slate-400">
                                    {(mode === "login" || mode === "forgot-password" || mode === "reset-password" || mode === "verify-email") ? (
                                        <>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                Real-time pipeline monitoring
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                Advanced routing & delivery logic
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                Enterprise-grade security
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                Free forever for developers
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                No credit card required
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                                                Instant deployment
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </motion.div>

                            <motion.blockquote
                                key={`${mode}-quote`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="space-y-2 border-l-2 border-primary/50 pl-6"
                            >
                                {(mode === "login" || mode === "forgot-password" || mode === "reset-password" || mode === "verify-email") ? (
                                    <>
                                        <p className="text-xl font-medium leading-relaxed text-white/90">
                                            &ldquo;This platform has completely transformed how we manage our data pipelines. The routing engine is simply world-class.&rdquo;
                                        </p>
                                        <footer className="text-base text-slate-400 font-medium pt-2">
                                            — Sofia Davis, Head of Data Engineering
                                        </footer>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xl font-medium leading-relaxed text-white/90">
                                            &ldquo;Setting up Vellkopoint was the easiest infrastructure decision we've made. It just works, and resizing scales automatically.&rdquo;
                                        </p>
                                        <footer className="text-base text-slate-400 font-medium pt-2">
                                            — Alex Chen, CTO at TechFlow
                                        </footer>
                                    </>
                                )}
                            </motion.blockquote>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Mobile Layout (Single Column) */}
            <div className="lg:hidden flex min-h-screen w-full items-center justify-center p-6 bg-[#0A0A0B]">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex flex-col space-y-3 mb-8 text-center items-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                                <Command className="size-5" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {mode === "login" && "Welcome back"}
                            {mode === "signup" && "Create an account"}
                            {mode === "forgot-password" && "Reset Password"}
                            {mode === "reset-password" && "Set new password"}
                            {mode === "verify-email" && "Email Verification"}
                        </h1>
                        <p className="text-base text-slate-400">
                            {mode === "login" && "Enter your credentials to access your workspace."}
                            {mode === "signup" && "Get started with your free account today."}
                            {mode === "forgot-password" && "Enter your email to receive reset instructions."}
                            {mode === "reset-password" && "Please choose a strong password for your account."}
                            {mode === "verify-email" && "Confirm your email address to activate your account."}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
