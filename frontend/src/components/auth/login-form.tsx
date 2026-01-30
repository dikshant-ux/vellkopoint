"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/axios";

const formSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean(),
    otp: z.string().optional(),
});

type LoginFormData = z.infer<typeof formSchema>;

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [otpRequired, setOtpRequired] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        control,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
            otp: "",
        },
    });

    const emailValue = watch("email");
    const passwordValue = watch("password");

    // Clear server error when user types
    useEffect(() => {
        if (serverError) setServerError(null);
    }, [emailValue, passwordValue]);

    const handleResendVerification = async () => {
        if (!emailValue) return;
        setIsResending(true);
        try {
            await api.post("/auth/resend-verification", { email: emailValue });
            toast.success("Verification email resent!");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to resend email");
        } finally {
            setIsResending(false);
        }
    };

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setServerError(null);
        try {
            const body = new URLSearchParams();
            body.append("username", data.email);
            body.append("password", data.password);
            if (data.otp) {
                body.append("otp", data.otp);
            }

            const res = await api.post(`/auth/login?remember_me=${data.rememberMe}`, body, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            login(res.data.access_token, {
                id: res.data.user_id,
                email: data.email,
                full_name: res.data.full_name,
                is_verified: res.data.is_verified,
                is_two_factor_enabled: res.data.is_two_factor_enabled
            });

            toast.success("Welcome back!");
            router.push("/");
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Something went wrong";
            if (error.response?.status === 403) {
                if (msg === "2FA_REQUIRED") {
                    setOtpRequired(true);
                    toast.info("Please enter your 2FA code");
                } else if (msg === "EMAIL_NOT_VERIFIED") {
                    setServerError("EMAIL_NOT_VERIFIED");
                } else {
                    toast.error(msg);
                }
            } else if (error.response?.status === 401 || error.response?.status === 404) {
                setServerError(msg);
            } else {
                console.error("Login error:", error);
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className={otpRequired ? "hidden" : "space-y-4"}>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-300">Email</Label>
                    <Input
                        {...register("email")}
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            {...register("password")}
                            id="password"
                            type={showPassword ? "text" : "password"}
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
                    {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex items-center space-x-2">
                    <Controller
                        name="rememberMe"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="rememberMe"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        )}
                    />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Label
                                    htmlFor="rememberMe"
                                    className="text-sm text-slate-300 cursor-pointer select-none font-medium"
                                >
                                    Remember me
                                </Label>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Keep me logged in for 30 days</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {otpRequired && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="text-center mb-6">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <span className="text-xl">🔐</span>
                        </div>
                        <h3 className="text-lg font-medium text-white">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-400">Enter the code from your authenticator app.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-medium text-slate-300">Authentication Code</Label>
                        <Input
                            {...register("otp")}
                            id="otp"
                            placeholder="000000"
                            className="h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-center tracking-widest text-lg"
                            autoFocus
                            maxLength={6}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setOtpRequired(false)}
                        className="text-sm text-slate-400 hover:text-white w-full text-center hover:underline"
                    >
                        Back to login
                    </button>
                </motion.div>
            )}

            {serverError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center"
                >
                    {serverError === "EMAIL_NOT_VERIFIED" ? (
                        <div className="flex flex-col items-center gap-2">
                            <span>Email is not verified.</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-red-500/30 hover:bg-red-500/20 text-red-400"
                                onClick={handleResendVerification}
                                disabled={isResending}
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Sending...
                                    </>
                                ) : "Verify now"}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {serverError}.
                            {serverError === "Account not found" && (
                                <Link href="/signup" className="ml-1 text-primary hover:underline underline-offset-2">
                                    Create now.
                                </Link>
                            )}
                        </>
                    )}
                </motion.div>
            )}

            <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_25px_rgba(124,58,237,0.35)] transition-all duration-300"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {otpRequired ? "Verifying..." : "Signing in..."}
                    </>
                ) : (
                    otpRequired ? "Verify Code" : "Sign in"
                )}
            </Button>

            {!otpRequired && (
                <div className="text-center text-sm text-slate-400 mt-6 font-medium">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4">
                        Sign up
                    </Link>
                </div>
            )}
        </form>
    );
}
