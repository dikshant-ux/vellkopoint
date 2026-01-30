"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export function VerifyEmailUI({ token }: { token?: string }) {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMessage("Verification token is missing.");
            return;
        }

        const verifyToken = async () => {
            try {
                // Small delay for better UX (prevents flash if too fast)
                await new Promise(resolve => setTimeout(resolve, 1500));
                await api.post("/auth/verify-email", { token });
                setStatus("success");
            } catch (error: any) {
                console.error(error);
                setStatus("error");
                setErrorMessage(error.response?.data?.detail || "Invalid or expired verification link.");
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {status === "loading" && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center space-y-6 py-8"
                    >
                        <div className="relative">
                            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <Loader2 className="size-10 text-primary animate-spin" />
                            </div>
                            <motion.div
                                className="absolute inset-0 size-20 border-2 border-primary/20 rounded-full"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-semibold text-white">Verifying your email</h3>
                            <p className="text-slate-400">Please wait while we confirm your credentials...</p>
                        </div>
                    </motion.div>
                )}

                {status === "success" && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center space-y-6 py-8"
                    >
                        <div className="size-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                            <CheckCircle2 className="size-10 text-green-500" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-bold text-white">Email Verified!</h3>
                            <p className="text-slate-400 max-w-[320px]">
                                Your account is now active. You can now access all features of Vellkopoint.
                            </p>
                        </div>
                        <Button
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all mt-4 group"
                            onClick={() => router.push("/login")}
                        >
                            <span>Continue to Dashboard</span>
                            <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </motion.div>
                )}

                {status === "error" && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center space-y-6 py-8"
                    >
                        <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                            <XCircle className="size-10 text-red-500" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-bold text-white">Verification Failed</h3>
                            <p className="text-slate-400 max-w-[320px]">
                                {errorMessage}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full mt-4">
                            <Button
                                variant="outline"
                                className="h-12 border-white/10 text-white hover:bg-white/5 rounded-xl flex items-center justify-center"
                                onClick={() => router.refresh()}
                            >
                                <RefreshCw className="size-4 mr-2" />
                                Try Again
                            </Button>
                            <Link href="/login" className="w-full">
                                <Button
                                    variant="ghost"
                                    className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
                                >
                                    Back to Login
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
