import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <main id="main">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center px-4">
            <div className="h-96 w-full max-w-sm animate-pulse rounded-md border border-border bg-card" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
