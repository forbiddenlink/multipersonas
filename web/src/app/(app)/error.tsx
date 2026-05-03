"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
      <h2 className="text-xl font-semibold">Something broke</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || "Try refreshing the page. If this keeps happening, clear your browser cache."}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
