"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});

type FormData = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            await api.post("/auth/forgot-password", data);
            setIsSubmitted(true);
            toast.success("Reset link sent!");
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Something went wrong. Please try again.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!isSubmitted ? (
                <motion.div
                    key="forgot-password-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-slate-200 ml-1">
                                Email Address
                            </Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <Input
                                    {...register("email")}
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                                    autoComplete="email"
                                />
                            </div>
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="text-xs font-medium text-red-400 mt-1 ml-1"
                                >
                                    {errors.email.message}
                                </motion.p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    <span>Sending Link...</span>
                                </div>
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="size-4" />
                                <span>Back to Login</span>
                            </Link>
                        </div>
                    </form>
                </motion.div>
            ) : (
                <motion.div
                    key="success-message"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center space-y-6 py-4"
                >
                    <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(124,58,237,0.1)]">
                        <CheckCircle2 className="size-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">Check your email</h3>
                        <p className="text-slate-400 max-w-[300px] mx-auto">
                            We've sent a password reset link to your email address.
                        </p>
                    </div>
                    <div className="pt-4 w-full">
                        <Link href="/login" className="w-full">
                            <Button
                                variant="outline"
                                className="w-full h-12 border-white/10 text-white hover:bg-white/5 rounded-xl"
                            >
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
