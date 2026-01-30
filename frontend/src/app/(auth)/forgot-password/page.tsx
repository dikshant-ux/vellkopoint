import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <AuthSplitLayout mode="forgot-password">
            <ForgotPasswordForm />
        </AuthSplitLayout>
    );
}
