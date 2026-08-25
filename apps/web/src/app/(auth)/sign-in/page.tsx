import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { RedirectIfAuthenticated } from "@/features/auth/RedirectIfAuthenticated";
import { SignInForm } from "@/features/auth/SignInForm";

export const metadata = { title: "Sign in — Asian" };

export default function SignInPage() {
  return (
    <RedirectIfAuthenticated to="/home">
      <AuthCard
        title="Welcome back"
        description="Sign in to keep your streak going."
        footer={
          <span className="text-muted-foreground">
            No account yet?{" "}
            <Link
              href="/sign-up"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Sign up
            </Link>
          </span>
        }
      >
        <SignInForm />
      </AuthCard>
    </RedirectIfAuthenticated>
  );
}
