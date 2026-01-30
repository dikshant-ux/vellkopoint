"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import {
    User,
    Lock,
    Save,
    UserCircle,
    ShieldCheck,
    Menu,
    LogOut,
    RefreshCw,
    Eye,
    EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);

    // Profile State
    const [fullName, setFullName] = useState(user?.full_name || "");
    const [email, setEmail] = useState(user?.email || "");

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // 2FA State
    const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_two_factor_enabled || false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [showSetup, setShowSetup] = useState(false);

    // Disable 2FA State
    const [disablePassword, setDisablePassword] = useState("");
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [showDisablePassword, setShowDisablePassword] = useState(false);

    useEffect(() => {
        if (user) {
            setIs2FAEnabled(user.is_two_factor_enabled || false);
        }
    }, [user]);

    const handleStartSetup2FA = async () => {
        setLoading(true);
        try {
            const res = await api.post("/auth/2fa/setup");
            setQrCode(res.data.qr_code);
            setSetupSecret(res.data.secret);
            setShowSetup(true);
        } catch (error) {
            toast.error("Failed to start 2FA setup");
        } finally {
            setLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        setLoading(true);
        try {
            await api.post("/auth/2fa/enable", { token: verificationCode, secret: setupSecret });
            setIs2FAEnabled(true);
            setShowSetup(false);
            setQrCode(null);
            setSetupSecret(null);
            setVerificationCode("");
            toast.success("Two-factor authentication enabled");
        } catch (error) {
            toast.error("Invalid verification code");
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!disablePassword) {
            toast.error("Password is required");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/2fa/disable", { password: disablePassword });
            setIs2FAEnabled(false);
            setShowDisableConfirm(false);
            setDisablePassword("");
            toast.success("Two-factor authentication disabled");
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Failed to disable 2FA";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put("/auth/me", { full_name: fullName });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword) {
            toast.error("Current password is required");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await api.put("/auth/password", { current_password: currentPassword, new_password: newPassword });
            toast.success("Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Failed to update password", error);
            const msg = error.response?.data?.detail || "Failed to update password";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 py-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Security
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Update your personal details and how others see you on the platform.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        disabled
                                        value={email}
                                    />
                                    <p className="text-[10px] text-muted-foreground px-1">Email cannot be changed.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50/50 flex justify-end py-3">
                            <Button size="sm" onClick={handleUpdateProfile} disabled={loading || fullName === user?.full_name}>
                                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-red-100 bg-red-50/20">
                        <CardHeader>
                            <CardTitle className="text-red-600 text-lg">Danger Zone</CardTitle>
                            <CardDescription>
                                Actions here are permanent and cannot be undone.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-sm">Sign out of all devices</p>
                                    <p className="text-xs text-muted-foreground">This will invalidate all active sessions.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Secure your account by using a strong, unique password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="max-w-md space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">Current Password</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50/50 flex justify-end py-3">
                            <Button size="sm" onClick={handleUpdatePassword} disabled={loading || !newPassword}>
                                <Lock className="mr-2 h-4 w-4" /> Update Password
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Two-Factor Authentication</CardTitle>
                            <CardDescription>
                                Add an extra layer of security to your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!is2FAEnabled ? (
                                !showSetup ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">2FA is currently disabled</p>
                                            <p className="text-sm text-muted-foreground">Protect your account with an authentication app.</p>
                                        </div>
                                        <Button onClick={handleStartSetup2FA} disabled={loading}>
                                            Setup 2FA
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                        <div className="text-center space-y-2">
                                            <p className="font-medium">Scan this QR Code</p>
                                            <p className="text-xs text-muted-foreground">Use Google Authenticator or compatible app.</p>
                                            {qrCode && (
                                                <div className="flex justify-center my-4">
                                                    <img src={qrCode} alt="2FA QR Code" className="border rounded bg-white p-2 w-48 h-48" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 max-w-xs mx-auto">
                                            <Label>Verification Code</Label>
                                            <Input
                                                placeholder="Enter 6-digit code"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                            />
                                            <div className="flex gap-2 pt-2">
                                                <Button className="flex-1" onClick={handleEnable2FA} disabled={loading || !verificationCode}>
                                                    Verify & Enable
                                                </Button>
                                                <Button variant="ghost" onClick={() => setShowSetup(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                !showDisableConfirm ? (
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-green-900">2FA is enabled</p>
                                                <p className="text-sm text-green-700">Your account is secure.</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => setShowDisableConfirm(true)}
                                            disabled={loading}
                                        >
                                            Disable
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 border border-red-200 rounded-lg bg-red-50/20 p-4">
                                        <div className="space-y-1">
                                            <p className="font-medium text-red-900">Disable Two-Factor Authentication</p>
                                            <p className="text-sm text-red-700">Please enter your password to confirm this action.</p>
                                        </div>

                                        <div className="space-y-4 max-w-sm">
                                            <div className="space-y-2">
                                                <Label htmlFor="disablePassword">Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="disablePassword"
                                                        type={showDisablePassword ? "text" : "password"}
                                                        value={disablePassword}
                                                        onChange={(e) => setDisablePassword(e.target.value)}
                                                        className="pr-10 bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDisablePassword(!showDisablePassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                                                    >
                                                        {showDisablePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="destructive"
                                                    onClick={handleDisable2FA}
                                                    disabled={loading || !disablePassword}
                                                >
                                                    {loading ? "Disabling..." : "Confirm Disable"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setShowDisableConfirm(false);
                                                        setDisablePassword("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


            </Tabs >
        </div >
    );
}
