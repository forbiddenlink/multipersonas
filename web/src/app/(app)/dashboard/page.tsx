"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditResults, type AuditResponse } from "@/components/audit-results";

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setResults(data as AuditResponse);
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (results) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
          <Button variant="outline" onClick={() => { setResults(null); setUrl(""); }}>
            New audit
          </Button>
        </div>
        <AuditResults results={results} onReset={() => { setResults(null); setUrl(""); }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Test your site with AI personas
      </p>

      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Run an audit</CardTitle>
          <CardDescription>
            Paste a URL. Three AI personas will browse it and report what they find.
            Your first audit takes about 2 minutes. Results include WCAG violations,
            usability issues, and persona-specific findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={loading}
              autoComplete="url"
              className="flex-1 h-10 rounded-lg border border-border bg-background px-4 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
            />
            <Button type="submit" disabled={loading || !url}>
              {loading ? "Running..." : "Run audit"}
            </Button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          {loading && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Three AI personas are browsing your site. This takes 1-2 minutes.
              </p>
              <div className="flex gap-3">
                {["First-Time Visitor", "Screen Reader User", "Mobile User"].map((name) => (
                  <div key={name} className="flex-1 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Browsing...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
