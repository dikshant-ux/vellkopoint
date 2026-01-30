"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";

const formSchema = z.object({
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[@$!%*?&]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const password = watch("password", "");

    const requirements = [
        { label: "At least 8 characters", valid: password.length >= 8 },
        { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
        { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
        { label: "At least one number", valid: /[0-9]/.test(password) },
        { label: "At least one special character (@$!%*?&)", valid: /[@$!%*?&]/.test(password) },
    ];

    const onSubmit = async (data: FormData) => {
        if (!token) {
            toast.error("Invalid reset session. Please request a new link.");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/auth/reset-password", {
                token: token,
                new_password: data.password,
            });
            toast.success("Password updated successfully!");
            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Failed to reset password. Link might be expired.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password text-sm font-medium text-slate-200 ml-1">New Password</Label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <Input
                            {...register("password")}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword text-sm font-medium text-slate-200 ml-1">Confirm New Password</Label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <Input
                            {...register("confirmPassword")}
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                        />
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-xs font-medium text-red-400 mt-1 ml-1">{errors.confirmPassword.message}</p>
                    )}
                </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password Requirements</p>
                <ul className="space-y-2">
                    {requirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                            {req.valid ? (
                                <Check className="size-4 text-green-500" />
                            ) : (
                                <X className="size-4 text-slate-600" />
                            )}
                            <span className={req.valid ? "text-slate-200" : "text-slate-500"}>
                                {req.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        <span>Updating Password...</span>
                    </div>
                ) : (
                    "Reset Password"
                )}
            </Button>
        </form>
    );
}
