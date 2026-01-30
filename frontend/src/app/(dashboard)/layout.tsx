"use client";
import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation";
import React from "react";
import { BreadcrumbProvider, useBreadcrumbs } from "@/context/breadcrumb-context";

function BreadcrumbHeader() {
    const pathname = usePathname();
    const { overrides } = useBreadcrumbs();

    // Simple breadcrumb generation logic
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        // Use override if available, otherwise capitalize
        const title = overrides[href] || (segment.charAt(0).toUpperCase() + segment.slice(1));
        return { title, href, isLast };
    });

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.length > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href}>
                        <BreadcrumbItem>
                            {crumb.isLast ? (
                                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!crumb.isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <BreadcrumbProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="min-w-0">
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-all">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <BreadcrumbHeader />
                    </header>
                    <div className="flex-1 min-w-0 space-y-4 p-8 pt-6 overflow-x-hidden">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}
