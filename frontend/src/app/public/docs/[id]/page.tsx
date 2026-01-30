"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Terminal, Globe, ShieldCheck, Code, ArrowRight, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PublicDocData {
    name: string;
    source_id: string;
    api_key: string;
    type: string;
    fields: { vendor_field: string; system_field: string; required: boolean }[];
    ingest_url: string;
}

export default function PublicDocsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<PublicDocData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const res = await api.get(`/public/sources/${id}/docs`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch documentation", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, [id]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading documentation...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-destructive">Source Not Found</CardTitle>
                        <CardDescription>
                            The documentation link you followed appears to be invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Use the API URL from environment
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const fullIngestUrl = `${apiBase}${data.ingest_url}`;

    // Generate Examples

    // Manual construction to avoid URL encoding of curly braces
    const queryParts = [];
    queryParts.push(`api_key=${data.api_key}`);
    data.fields.forEach(f => {
        queryParts.push(`${f.vendor_field}={{${f.vendor_field}}}`);
    });
    const getUrlExample = `${fullIngestUrl}?${queryParts.join("&")}`;

    const postBodyExample = {
        api_key: data.api_key,
        ...data.fields.reduce((acc, f) => ({ ...acc, [f.vendor_field]: `{{${f.vendor_field}}}` }), {})
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white p-8 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 px-3 py-1">
                                API Documentation
                            </Badge>
                            <span className="text-slate-300">/</span>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{data.name}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Integration Guide</h1>
                        <p className="text-lg text-slate-600 mt-2 max-w-2xl">
                            Complete reference for integrating with the <strong>{data.name}</strong> data source.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Main Info) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Method 1: POST */}
                        <Card className="shadow-sm border-blue-100 overflow-hidden">
                            <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl text-blue-900 flex items-center gap-2">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Code className="w-5 h-5 text-blue-600" />
                                            </div>
                                            Method 1: POST Request <Badge className="ml-2 bg-blue-600 hover:bg-blue-700">Recommended</Badge>
                                        </CardTitle>
                                        <CardDescription className="text-blue-700">
                                            Send data as a JSON object in the request body.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="font-mono bg-white text-blue-600 border-blue-200">POST</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4 text-blue-500" /> Endpoint URL
                                    </div>
                                    <div className="relative group">
                                        <div className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-sm break-all pr-24">
                                            {fullIngestUrl}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute right-2 top-2 h-7 text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border-slate-600"
                                            onClick={() => copyToClipboard(fullIngestUrl, 'post_endpoint')}
                                        >
                                            {copied === 'post_endpoint' ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4 text-blue-500" /> Example Body (JSON)
                                    </div>
                                    <div className="relative group">
                                        <pre className="p-4 bg-slate-900 text-blue-100 rounded-md font-mono text-sm overflow-x-auto border-l-4 border-blue-500">
                                            {JSON.stringify(postBodyExample, null, 2)}
                                        </pre>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute right-4 top-4 h-8 text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border-slate-600"
                                            onClick={() => copyToClipboard(JSON.stringify(postBodyExample, null, 2), 'post_body')}
                                        >
                                            {copied === 'post_body' ? "Copied" : <><Copy className="w-3 h-3 mr-2" /> Copy JSON</>}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 italic">
                                        * Replace values in <code>{"{{}}"}</code> with your actual data.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Method 2: GET */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Globe className="w-5 h-5 text-slate-600" />
                                            </div>
                                            Method 2: GET Request
                                        </CardTitle>
                                        <CardDescription>
                                            Send data via URL query parameters. Useful for simple tracking pixels or webhooks.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="font-mono bg-white text-slate-600">GET</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4 text-slate-400" /> Example URL
                                    </div>
                                    <div className="relative group">
                                        <div className="p-4 bg-slate-50 text-slate-600 rounded-md font-mono text-xs break-all border border-slate-200 leading-relaxed group-hover:bg-slate-100 transition-colors">
                                            {getUrlExample}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-2 top-2 h-7 text-xs"
                                            onClick={() => copyToClipboard(getUrlExample, 'get_url')}
                                        >
                                            {copied === 'get_url' ? "Copied!" : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="space-y-8">

                        {/* Authentication */}
                        <Card className="shadow-sm border-green-100">
                            <CardHeader className="bg-green-50/30 border-b border-green-100 pb-4">
                                <CardTitle className="text-base font-semibold text-green-800 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Authentication
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-slate-600 mb-3">
                                    All requests must include your unique <strong>API Key</strong>.
                                </p>
                                <div className="p-3 bg-white rounded border border-green-200 flex items-center justify-between shadow-sm">
                                    <code className="text-sm font-bold text-green-700 truncate mr-2">{data.api_key}</code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => copyToClipboard(data.api_key, 'apikey')}
                                    >
                                        {copied === 'apikey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Field Reference */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-slate-500" /> Field Reference
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Parameters accepted by this source.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-8 text-xs font-semibold">Parameter</TableHead>
                                            <TableHead className="h-8 text-xs font-semibold text-right">Required</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.fields.map((field, idx) => (
                                            <TableRow key={idx} className="hover:bg-slate-50">
                                                <TableCell className="py-2 text-xs font-mono font-medium text-blue-600">
                                                    {field.vendor_field}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    {field.required ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                                                            Yes
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Opt</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Support Info */}
                        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 mb-2">Need integration help?</p>
                            <a href="#" className="text-sm font-medium text-indigo-600 hover:underline">Contact Support</a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
