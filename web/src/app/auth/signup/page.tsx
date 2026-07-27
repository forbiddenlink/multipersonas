import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-96 w-full max-w-sm animate-pulse rounded-xl bg-muted" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
