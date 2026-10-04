import type { Metadata } from "next";
import { githubSignInEnabled } from "@/lib/auth-providers";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const githubEnabled = await githubSignInEnabled();
  return (
    <main id="main">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center px-4">
            <div className="sheet h-[28rem] w-full max-w-sm animate-pulse" />
          </div>
        }
      >
        <SignupForm githubEnabled={githubEnabled} />
      </Suspense>
    </main>
  );
}
