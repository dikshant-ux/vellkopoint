"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface DestinationFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    destinationId?: string | null;
    initialData?: {
        name: string;
        config: {
            url: string;
            method: string;
            api_key?: string;
            auth_type?: string;
            auth_credentials?: Record<string, string>;
            auth_credentials?: Record<string, string>;
            headers?: Record<string, string>;
            content_type?: string;
        };
    } | null;
    onSuccess: () => void;
}

export function DestinationFormDialog({
    open,
    onOpenChange,
    customerId,
    destinationId,
    initialData,
    onSuccess,
}: DestinationFormDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [method, setMethod] = useState("POST");
    const [contentType, setContentType] = useState("json");
    const [apiKey, setApiKey] = useState("");
    const [authType, setAuthType] = useState("none");
    const [authCredentials, setAuthCredentials] = useState<Record<string, string>>({});
    const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setUrl(initialData.config.url);
                setMethod(initialData.config.method);
                setContentType(initialData.config.content_type || "json");
                setApiKey(initialData.config.api_key || "");
                setAuthType(initialData.config.auth_type || "none");
                setAuthCredentials(initialData.config.auth_credentials || {});

                // Convert headers object to array
                const headersArray = Object.entries(initialData.config.headers || {}).map(([key, value]) => ({
                    key,
                    value
                }));
                setHeaders(headersArray.length > 0 ? headersArray : []);
            } else {
                setName("");
                setUrl("");
                setMethod("POST");
                setContentType("json");
                setApiKey("");
                setAuthType("none");
                setAuthCredentials({});
                setHeaders([]);
            }
        }
    }, [open, initialData]);

    const handleSave = async () => {
        if (!name.trim() || !url.trim()) return;
        try {
            setIsSaving(true);

            // Convert headers array to object
            const headersObj = headers.reduce((acc, h) => {
                if (h.key.trim() && h.value.trim()) {
                    acc[h.key.trim()] = h.value.trim();
                }
                return acc;
            }, {} as Record<string, string>);

            const payload = {
                name: name.trim(),
                type: "api",
                config: {
                    url: url.trim(),
                    method: method,
                    content_type: contentType,
                    api_key: apiKey.trim() || undefined,
                    auth_type: authType,
                    auth_credentials: authCredentials,
                    headers: headersObj,
                },
            };

            if (destinationId) {
                await api.put(`/customers/${customerId}/destinations/${destinationId}`, payload);
            } else {
                await api.post(`/customers/${customerId}/destinations`, payload);
            }
            onSuccess();
        } catch (error) {
            console.error(destinationId ? "Failed to update destination" : "Failed to add destination", error);
        } finally {
            setIsSaving(false);
        }
    };

    const addHeader = () => {
        setHeaders([...headers, { key: "", value: "" }]);
    };

    const removeHeader = (index: number) => {
        setHeaders(headers.filter((_, i) => i !== index));
    };

    const updateHeader = (index: number, field: "key" | "value", value: string) => {
        const newHeaders = [...headers];
        newHeaders[index][field] = value;
        setHeaders(newHeaders);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{destinationId ? "Edit Destination Endpoint" : "Add Destination Endpoint"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Basic Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700">Basic Configuration</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="destName">Friendly Name</Label>
                            <Input
                                id="destName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Client Webhook"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="destUrl">Destination URL</Label>
                            <Input
                                id="destUrl"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://client-api.com/v1/leads"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>HTTP Method</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Content Type</Label>
                            <Select value={contentType} onValueChange={setContentType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="json">JSON (application/json)</SelectItem>
                                    <SelectItem value="form">Form Data (x-www-form-urlencoded)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="destApiKey">API Key (Optional - Legacy)</Label>
                            <Input
                                id="destApiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="e.g. sk_test_..."
                                type="password"
                            />
                            <p className="text-xs text-muted-foreground">Use Authentication section below for modern auth methods</p>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-sm font-semibold text-slate-700">Authentication</h3>
                        <div className="grid gap-2">
                            <Label>Authentication Type</Label>
                            <Select value={authType} onValueChange={(value) => {
                                setAuthType(value);
                                setAuthCredentials({});
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="basic">Basic Auth</SelectItem>
                                    <SelectItem value="bearer">Bearer Token</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Basic Auth Fields */}
                        {authType === "basic" && (
                            <div className="space-y-3 bg-slate-50 p-4 rounded-md border">
                                <div className="grid gap-2">
                                    <Label>Username</Label>
                                    <Input
                                        value={authCredentials.username || ""}
                                        onChange={(e) => setAuthCredentials({ ...authCredentials, username: e.target.value })}
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        value={authCredentials.password || ""}
                                        onChange={(e) => setAuthCredentials({ ...authCredentials, password: e.target.value })}
                                        placeholder="Enter password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Bearer Token Field */}
                        {authType === "bearer" && (
                            <div className="bg-slate-50 p-4 rounded-md border">
                                <div className="grid gap-2">
                                    <Label>Bearer Token</Label>
                                    <Input
                                        type="password"
                                        value={authCredentials.token || ""}
                                        onChange={(e) => setAuthCredentials({ token: e.target.value })}
                                        placeholder="Enter bearer token"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Custom Auth Info */}
                        {authType === "custom" && (
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                <p className="text-xs text-blue-800">
                                    Custom authentication credentials can be configured via API or use the Headers section below for custom header-based auth.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Custom Headers */}
                    <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">Custom Headers (Optional)</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                                <Plus className="w-3 h-3 mr-1" />
                                Add Header
                            </Button>
                        </div>

                        {headers.length > 0 ? (
                            <div className="space-y-2">
                                {headers.map((header, index) => (
                                    <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-md border">
                                        <div className="flex-1 grid gap-2">
                                            <Input
                                                placeholder="Header Key (e.g. Content-Type)"
                                                value={header.key}
                                                onChange={(e) => updateHeader(index, "key", e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="flex-1 grid gap-2">
                                            <Input
                                                placeholder="Header Value (e.g. application/json)"
                                                value={header.value}
                                                onChange={(e) => updateHeader(index, "value", e.target.value)}
                                                className="bg-white"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeHeader(index)}
                                            className="mt-0.5"
                                        >
                                            <X className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-md border border-dashed">
                                <p className="text-sm text-muted-foreground">No custom headers configured</p>
                                <p className="text-xs text-muted-foreground mt-1">Click "Add Header" to add custom HTTP headers</p>
                            </div>
                        )}
                    </div>

                    <Button onClick={handleSave} className="w-full" disabled={isSaving || !name || !url}>
                        {isSaving ? (destinationId ? "Saving..." : "Adding...") : (destinationId ? "Save Changes" : "Add Destination")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
