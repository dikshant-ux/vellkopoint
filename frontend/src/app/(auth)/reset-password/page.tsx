import { use } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const resolvedSearchParams = use(searchParams);
    const token = resolvedSearchParams.token;

    return (
        <AuthSplitLayout mode="reset-password">
            {token ? (
                <ResetPasswordForm token={token} />
            ) : (
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Invalid Request</h3>
                        <p className="text-slate-400">
                            The password reset link is missing or has expired.
                        </p>
                    </div>
                    <Link href="/forgot-password" title="Request new link" className="w-full">
                        <Button variant="outline" className="w-full h-12 border-white/10 text-white hover:bg-white/5 rounded-xl">
                            Request new link
                        </Button>
                    </Link>
                </div>
            )}
        </AuthSplitLayout>
    );
}
