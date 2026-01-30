import { use } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { VerifyEmailUI } from "@/components/auth/verify-email-ui";

export default function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const resolvedSearchParams = use(searchParams);
    const token = resolvedSearchParams.token;

    return (
        <AuthSplitLayout mode="verify-email">
            <VerifyEmailUI token={token} />
        </AuthSplitLayout>
    );
}
