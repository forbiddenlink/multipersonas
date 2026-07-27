import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-96 w-full max-w-sm animate-pulse rounded-xl bg-muted" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
