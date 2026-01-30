"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import api from "@/lib/api"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

function AcceptInvitationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)
    const [invitationData, setInvitationData] = useState<any>(null)
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })

    useEffect(() => {
        if (!token) {
            setValidating(false)
            setTokenValid(false)
            return
        }

        validateToken()
    }, [token])

    const validateToken = async () => {
        try {
            const res = await api.get(`/users/validate-invitation?token=${token}`)
            setTokenValid(true)
            setInvitationData(res.data)
        } catch (error: any) {
            setTokenValid(false)
            const errorMsg = error.response?.data?.detail || "Invalid or expired invitation link"
            toast.error(errorMsg)
        } finally {
            setValidating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters long")
            return
        }

        setLoading(true)

        try {
            const res = await api.post("/users/accept-invitation", {
                token,
                password: formData.password,
            })

            toast.success("Account activated successfully!", {
                description: "You can now log in with your credentials",
            })

            // Store the access token
            localStorage.setItem("accessToken", res.data.access_token)

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/")
            }, 1500)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to activate account")
        } finally {
            setLoading(false)
        }
    }

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                            <p className="text-gray-600">Validating invitation...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!token || !tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center justify-center mb-4">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Invalid Invitation</CardTitle>
                        <CardDescription className="text-center">
                            This invitation link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 text-center">
                                Invitation links are valid for 24 hours. Please contact your administrator for a
                                new invitation.
                            </p>
                            <Button
                                className="w-full"
                                onClick={() => router.push("/login")}
                            >
                                Go to Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <CardTitle className="text-center">Accept Invitation</CardTitle>
                    <CardDescription className="text-center">
                        Welcome <strong>{invitationData?.email}</strong>!
                        <br />
                        Set your password to activate your account as a <strong>{invitationData?.role}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                required
                                minLength={8}
                            />
                        </div>

                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-800">Passwords do not match</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || formData.password !== formData.confirmPassword}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Activate Account
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                            <p className="text-gray-600">Loading...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        }>
            <AcceptInvitationContent />
        </Suspense>
    )
}
