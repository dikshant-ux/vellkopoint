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

    useEffect(() => {
        const initAuth = async () => {
            console.log("AuthContext: Initializing...");
            const token = localStorage.getItem("accessToken");

            if (!token) {
                // Check if we are on a public page BEFORE attempting refresh
                const isPublic = PUBLIC_PATHS.some(p => pathname?.startsWith(p));

                if (isPublic) {
                    console.log("AuthContext: Public path detected, skipping refresh...");
                    setIsLoading(false);
                    return;
                }

                console.log("AuthContext: No token found, attempting refresh...");
                try {
                    const res = await axiosInstance.post("/auth/refresh");
                    console.log("AuthContext: Refresh successful", res.data);
                    const { access_token } = res.data;
                    localStorage.setItem("accessToken", access_token);

                    // Fetch me
                    const meRes = await axiosInstance.get("/auth/me");
                    console.log("AuthContext: Fetched user", meRes.data);
                    setUser(meRes.data);
                } catch (e) {
                    console.warn("AuthContext: Refresh/Init failed (User likely guest)", e);

                    // Clear artifacts
                    localStorage.removeItem("accessToken");
                    setUser(null);

                    // Force clear cookie on server to prevent middleware loop
                    try {
                        await axiosInstance.post("/auth/clear-session");
                    } catch (clearErr) {
                        console.error("Failed to clear session", clearErr);
                    }

                    // We already checked isPublic above, so if we are here, it's a protected path
                    console.log("AuthContext: Redirecting to login...");
                    window.location.href = "/login";
                }
                setIsLoading(false);
                return;
            }

            console.log("AuthContext: Token found, fetching user...");
            try {
                const res = await axiosInstance.get("/auth/me");
                console.log("AuthContext: Fetched user", res.data);
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

                const isPublic = PUBLIC_PATHS.some(p => pathname?.startsWith(p));
                if (!isPublic) {
                    window.location.href = "/login";
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, [pathname]);

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
