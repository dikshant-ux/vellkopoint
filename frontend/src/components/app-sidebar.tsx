"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
    Boxes,
    LayoutDashboard,
    Settings,
    Users,
    Command,
    Database,
    FileQuestion,
    UserPlus,
    CheckCircle,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { useAuth } from "@/context/auth-context"
import { ChevronsUpDown, LogOut, Check } from "lucide-react"
import { Permission } from "@/lib/permissions"

const data = {
    navMain: [
        {
            title: "Platform",
            items: [
                {
                    title: "Dashboard",
                    url: "/",
                    icon: LayoutDashboard,
                    requiredPermission: Permission.VIEW_ANALYTICS,
                },
                {
                    title: "Vendors",
                    url: "/vendors",
                    icon: Boxes,
                    requiredPermission: Permission.VIEW_VENDORS,
                },
                {
                    title: "Customers",
                    url: "/customers",
                    icon: Users,
                    requiredPermission: Permission.VIEW_CUSTOMERS,
                },
                {
                    title: "Leads",
                    url: "/leads",
                    icon: Database,
                    requiredPermission: Permission.VIEW_LEADS,
                },
                {
                    title: "Unknown Fields",
                    url: "/unknown-fields",
                    icon: FileQuestion,
                    requiredPermission: Permission.VIEW_SYSTEM_FIELDS,
                },
            ],
        },
        {
            title: "Administration",
            items: [
                {
                    title: "Users",
                    url: "/users",
                    icon: UserPlus,
                    requiredAnyPermission: [Permission.VIEW_USERS, Permission.VIEW_ROLES],
                },
                {
                    title: "Approvals",
                    url: "/approvals",
                    icon: CheckCircle,
                    requiredPermission: Permission.APPROVE_DESTINATIONS,
                },
            ],
        },
        {
            title: "Settings",
            items: [
                {
                    title: "System Fields",
                    url: "/system-fields",
                    icon: Database,
                    requiredPermission: Permission.VIEW_SYSTEM_FIELDS,
                },
                {
                    title: "General",
                    url: "/settings",
                    icon: Settings,
                    // No permission required (Profile/Security)
                },
            ],
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const { isMobile } = useSidebar()
    const router = useRouter()
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">VellkoPoint</span>
                                    <span className="truncate text-xs">Data Router</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {data.navMain.map((group) => {
                    const filteredItems = group.items.filter((item: any) => {
                        // 1. Owner bypass - owners see everything
                        if (user?.role === "owner") return true;

                        // 2. Permission check
                        if (item.requiredPermission) {
                            const userPermissions = user?.permissions || [];
                            return userPermissions.includes(item.requiredPermission);
                        }

                        // 3. Any Permission check (OR logic)
                        if (item.requiredAnyPermission) {
                            const userPermissions = user?.permissions || [];
                            return item.requiredAnyPermission.some((perm: string) => userPermissions.includes(perm));
                        }



                        // 4. Fallback for items with no permission
                        return true;
                    });

                    // Don't render empty groups
                    if (filteredItems.length === 0) {
                        return null;
                    }

                    return (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {filteredItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                isActive={pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))}
                                            >
                                                <a href={item.url}>
                                                    <item.icon className="!size-5" />
                                                    <span>{item.title}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>
            <SidebarFooter>
                {isMounted ? (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${user?.full_name || "User"}`} alt={user?.full_name || "User"} />
                                            <AvatarFallback className="rounded-lg">
                                                {user?.full_name?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{user?.full_name || "User"}</span>
                                            <span className="truncate text-xs">{user?.email || "user@example.com"}</span>
                                        </div>
                                        <ChevronsUpDown className="ml-auto size-4" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                    side={isMobile ? "bottom" : "right"}
                                    align="end"
                                    sideOffset={4}
                                >
                                    <DropdownMenuLabel className="p-0 font-normal">
                                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${user?.full_name || "User"}`} alt={user?.full_name || "User"} />
                                                <AvatarFallback className="rounded-lg">
                                                    {user?.full_name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">{user?.full_name || "User"}</span>
                                                <span className="truncate text-xs">{user?.email || "user@example.com"}</span>
                                            </div>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => router.push("/settings")}>
                                            <Users className="mr-2 h-4 w-4" />
                                            Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/settings")}>
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                ) : (
                    <div className="h-12 w-full animate-pulse bg-slate-800/50 rounded-lg" />
                )}
            </SidebarFooter>
        </Sidebar>
    )
}
