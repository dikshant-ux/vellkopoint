"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axiosInstance from "@/lib/axios";

interface User {
    id: string;
    email: string;
    full_name: string;
    is_verified: boolean;
    is_two_factor_enabled: boolean;
    // RBAC fields
    role?: string;
    permissions?: string[];
    is_active?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: () => { },
    logout: async () => { },
    setUser: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Define public paths once to avoid inconsistencies
    // These paths do not require authentication and should not trigger redirects on auth failure
    const PUBLIC_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/accept-invitation"];

    // 1. Initial Data Fetching (Runs only once on mount)
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("accessToken");

            if (!token) {
                // If on a public path and no token, don't even try to refresh.
                // Just stop loading and let the user be a guest.
                const isPublic = window.location.pathname === "/" || PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
                if (isPublic) {
                    setIsLoading(false);
                    return;
                }

                try {
                    const res = await axiosInstance.post("/auth/refresh");
                    const { access_token } = res.data;
                    localStorage.setItem("accessToken", access_token);

                    // Fetch me
                    const meRes = await axiosInstance.get("/auth/me");
                    setUser(meRes.data);
                } catch (e) {
                    // Refresh/Init failed (User likely guest)
                    // Clear artifacts
                    localStorage.removeItem("accessToken");
                    setUser(null);

                    // Force clear cookie on server to prevent middleware loop
                    try {
                        await axiosInstance.post("/auth/clear-session");
                    } catch (clearErr) {
                        console.error("Failed to clear session", clearErr);
                    }
                }
                setIsLoading(false);
                return;
            }

            try {
                const res = await axiosInstance.get("/auth/me");
                setUser(res.data);
            } catch (error) {
                console.error("AuthContext: Fetch 'me' failed", error);
                localStorage.removeItem("accessToken");
                setUser(null);

                // Force clear cookie on server
                try {
                    await axiosInstance.post("/auth/clear-session");
                } catch (clearErr) {
                    console.error("Failed to clear session", clearErr);
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // 2. Route Protection (Runs on path change)
    useEffect(() => {
        if (isLoading) return;

        const isPublic = pathname === "/" || PUBLIC_PATHS.some(p => pathname?.startsWith(p));

        // If user is not logged in and trying to access a protected route
        if (!user && !isPublic) {
            // Use window.location.href for a hard redirect to ensure state clean slate
            // or router.push if we want valid client-side transition. 
            // Using window.location.href as per original implementation for safety.
            window.location.href = "/login";
        }
    }, [pathname, user, isLoading]);

    const login = (token: string, userData: User) => {
        localStorage.setItem("accessToken", token);
        setUser(userData);
    };

    const logout = async () => {
        try {
            await axiosInstance.post("/auth/logout");
        } catch (e) {
            console.error("Logout error", e);
            // Fallback
            await axiosInstance.post("/auth/clear-session");
        }
        localStorage.removeItem("accessToken");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
