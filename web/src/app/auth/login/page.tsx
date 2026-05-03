import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-96 w-full max-w-sm animate-pulse rounded-xl bg-muted" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
