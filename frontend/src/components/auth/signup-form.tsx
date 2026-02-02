"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";

// Strong password regex: min 8 chars, 1 upper, 1 lower, 1 number, 1 special
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const formSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().regex(passwordRegex, "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export function SignupForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const passwordValue = watch("password", "");

    const passwordRequirements = [
        { label: "At least 8 characters", regex: /.{8,}/ },
        { label: "One uppercase letter", regex: /[A-Z]/ },
        { label: "One lowercase letter", regex: /[a-z]/ },
        { label: "One number", regex: /[0-9]/ },
        { label: "One special character", regex: /[@$!%*?&]/ },
    ];

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            await api.post("/auth/signup", {
                email: data.email,
                password: data.password,
                full_name: data.fullName,
                confirm_password: data.confirmPassword,
            });
            setIsSuccess(true);
            toast.success("Account created successfully!");
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Something went wrong";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-white space-y-4"
            >
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold">Verify your email</h3>
                <p className="text-slate-300 text-sm">
                    We&apos;ve sent a verification link to your email address. Please check your inbox to activate your account.
                </p>
                <Button
                    className="mt-6 bg-white text-black hover:bg-white/90 font-medium"
                    onClick={() => router.push("/login")}
                >
                    Return to Login
                </Button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-slate-300">Full Name</Label>
                    <Input
                        {...register("fullName")}
                        id="fullName"
                        placeholder="John Doe"
                        className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                    />
                    {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-300">Email</Label>
                    <Input
                        {...register("email")}
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                    />
                    {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
                    <div className="relative">
                        <Input
                            {...register("password")}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                            className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400 leading-tight">{errors.password.message}</p>}

                    {/* Password Requirements Checklist - Appears only when typing */}
                    <AnimatePresence>
                        {passwordValue.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                                    {passwordRequirements.map((req, index) => {
                                        const isMet = req.regex.test(passwordValue);
                                        return (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className={`p-0.5 rounded-full transition-colors ${isMet ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                                                    {isMet ? <Check className="size-3" /> : <X className="size-3" />}
                                                </div>
                                                <span className={`text-[11px] font-medium transition-colors ${isMet ? 'text-green-500' : 'text-slate-500'}`}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">Confirm Password</Label>
                    <div className="relative">
                        <Input
                            {...register("confirmPassword")}
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
                </div>
            </div>

            <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_25px_rgba(124,58,237,0.35)] transition-all duration-300"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                    </>
                ) : (
                    "Create Account"
                )}
            </Button>

            <div className="text-center text-sm text-slate-400 mt-6 font-medium">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4">
                    Sign in
                </Link>
            </div>
        </form>
    );
}
