import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { RedirectIfAuthenticated } from "@/features/auth/RedirectIfAuthenticated";
import { SignUpForm } from "@/features/auth/SignUpForm";

export const metadata = { title: "Sign up — Asian" };

export default function SignUpPage() {
  return (
    <RedirectIfAuthenticated to="/home">
      <AuthCard
        title="Create your account"
        description="A few minutes a day is all it takes."
        footer={
          <span className="text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Sign in
            </Link>
          </span>
        }
      >
        <SignUpForm />
      </AuthCard>
    </RedirectIfAuthenticated>
  );
}
