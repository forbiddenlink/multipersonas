import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main id="main">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center px-4">
            <div className="sheet h-96 w-full max-w-sm animate-pulse" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
