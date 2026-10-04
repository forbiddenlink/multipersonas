import type { Metadata } from "next";
import { githubSignInEnabled } from "@/lib/auth-providers";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const githubEnabled = await githubSignInEnabled();
  return (
    <main id="main">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center px-4">
            <div className="sheet h-96 w-full max-w-sm animate-pulse" />
          </div>
        }
      >
        <LoginForm githubEnabled={githubEnabled} />
      </Suspense>
    </main>
  );
}
