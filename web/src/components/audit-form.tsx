"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuditResults, type AuditResponse } from "@/components/audit-results";
import { PERSONA_DATA, PERSONA_IDS } from "@/lib/personas";

const PERSONAS = PERSONA_IDS.map((id) => PERSONA_DATA[id]);
const STORAGE_KEY = "multipersonas-last-audit";

type PersonaStatus = "pending" | "running" | "complete";

export function AuditForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResponse | null>(null);
  const [personaStatuses, setPersonaStatuses] = useState<
    Record<string, PersonaStatus>
  >({});

  // Restore last audit results from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setResults(JSON.parse(saved));
      }
    } catch {
      // sessionStorage unavailable or corrupted — ignore
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);

    // Animate persona cards: all start pending, then go to running
    const statuses: Record<string, PersonaStatus> = {};
    for (const p of PERSONAS) {
      statuses[p.id] = "pending";
    }
    setPersonaStatuses({ ...statuses });

    // Stagger the "running" state for visual effect
    for (let i = 0; i < PERSONAS.length; i++) {
      setTimeout(() => {
        setPersonaStatuses((prev) => ({
          ...prev,
          [PERSONAS[i].id]: "running",
        }));
      }, i * 600);
    }

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

      // All complete
      const completed: Record<string, PersonaStatus> = {};
      for (const p of PERSONAS) {
        completed[p.id] = "complete";
      }
      setPersonaStatuses(completed);

      const auditResults = data as AuditResponse;
      setResults(auditResults);

      // Persist to sessionStorage so results survive refresh
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auditResults));
      } catch {
        // Storage full or unavailable — results still shown, just won't survive refresh
      }
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setUrl("");
    setResults(null);
    setError(null);
    setPersonaStatuses({});
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (results) {
    return <AuditResults results={results} onReset={handleReset} />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={loading}
          autoComplete="url"
          aria-label="Website URL to audit"
          className="flex-1 h-10 rounded-lg border border-border bg-card px-4 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading || !url}
          className="h-10 px-6 shrink-0"
        >
          {loading ? "Running..." : "Run Free Audit"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 text-center">
          {error === "Authentication required" ? (
            <p className="text-sm text-muted-foreground">
              <a href="/auth/signup" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Create a free account
              </a>
              {" "}to run audits and save your results.
            </p>
          ) : error.includes("audit limit") ? (
            <p className="text-sm text-yellow-400">{error}</p>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PERSONAS.map((persona) => {
            const status = personaStatuses[persona.id] || "pending";
            return (
              <div
                key={persona.id}
                className={`rounded-xl border border-border p-4 transition-all duration-500 ${
                  status === "running"
                    ? "border-primary/50 bg-primary/5"
                    : status === "complete"
                      ? "border-green-500/50 bg-green-500/5"
                      : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {status === "pending" && (
                    <span className="size-2 rounded-full bg-muted-foreground" />
                  )}
                  {status === "running" && (
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                  )}
                  {status === "complete" && (
                    <span className="size-2 rounded-full bg-green-500" />
                  )}
                  <span className="text-sm font-medium">{persona.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {persona.role}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {status === "pending" && "Waiting..."}
                  {status === "running" && "Browsing your site..."}
                  {status === "complete" && "Done"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
