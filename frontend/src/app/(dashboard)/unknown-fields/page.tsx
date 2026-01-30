"use client";

import { useEffect, useState } from "react";
import { UnknownFieldsTable } from "@/components/system/unknown-fields-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnknownFieldsPage() {
    const { user } = useAuth();
    // Unknown fields should be viewable by anyone who can view system fields (as they are potential system fields)
    const canView = user?.role === "owner" || user?.permissions?.includes(Permission.VIEW_SYSTEM_FIELDS);

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-500 max-w-sm mb-6">
                    You do not have permission to manage unknown field mappings.
                </p>
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Unknown Fields</h2>
                    <p className="text-muted-foreground">
                        Manage and map unknown fields detected during lead ingestion.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detected Fields</CardTitle>
                    <CardDescription>
                        A list of identified fields that do not match the system schema or existing mappings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UnknownFieldsTable />
                </CardContent>
            </Card>
        </div>
    );
}
