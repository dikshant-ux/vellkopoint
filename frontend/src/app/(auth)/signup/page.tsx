import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
    return (
        <AuthSplitLayout mode="signup">
            <SignupForm />
        </AuthSplitLayout>
    );
}
