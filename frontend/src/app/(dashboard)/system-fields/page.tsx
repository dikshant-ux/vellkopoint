"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemFieldsTable } from "@/components/system/system-fields-table";
import { useAuth } from "@/context/auth-context";
import { Permission } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemFieldsPage() {
    const { user } = useAuth();
    const canView = user?.role === "owner" || user?.permissions?.includes(Permission.VIEW_SYSTEM_FIELDS);

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-500 max-w-sm mb-6">
                    You do not have permission to view system fields configuration.
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
                    <h2 className="text-3xl font-bold tracking-tight">System Fields</h2>
                    <p className="text-muted-foreground">
                        Define the standard fields available in your system.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Schema Definition</CardTitle>
                    <CardDescription>
                        All configured system fields.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SystemFieldsTable />
                </CardContent>
            </Card>
        </div>
    );
}
