"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

interface BreadcrumbContextType {
    overrides: Record<string, string>;
    setOverride: (path: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [overrides, setOverrides] = useState<Record<string, string>>({});

    const setOverride = useCallback((path: string, label: string) => {
        setOverrides((prev) => {
            if (prev[path] === label) return prev;
            return { ...prev, [path]: label };
        });
    }, []);

    const value = useMemo(() => ({ overrides, setOverride }), [overrides, setOverride]);

    return (
        <BreadcrumbContext.Provider value={value}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumbs() {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error("useBreadcrumbs must be used within a BreadcrumbProvider");
    }
    return context;
}
