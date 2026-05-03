"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: "#1a1a2e", color: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "1rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something broke</h2>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "0.5rem", maxWidth: "24rem" }}>
            {error.message || "An unexpected error occurred. Try refreshing the page."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.375rem",
              backgroundColor: "#3bb8a8",
              color: "#1a1a2e",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
