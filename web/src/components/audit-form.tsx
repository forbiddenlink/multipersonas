"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuditResults, type AuditResponse } from "@/components/audit-results";
import {
  PERSONA_DATA,
  PERSONA_IDS,
  DEFAULT_PERSONA_IDS,
  MAX_PERSONAS,
  type PersonaId,
} from "@/lib/personas";

const STORAGE_KEY = "multipersonas-last-audit";

type PersonaStatus = "pending" | "running" | "complete";

function readStoredResults(): AuditResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AuditResponse) : null;
  } catch {
    return null;
  }
}

/** Poll a queued audit job until it completes or fails. The run happens in a worker,
 * not the request, so the browser can take as long as it needs. */
async function pollAuditJob(jobId: string): Promise<AuditResponse> {
  const deadlineMs = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`/api/audit/${jobId}`);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "completed" && data.result) {
      return data.result as AuditResponse;
    }
    if (data.status === "failed") {
      throw new Error(data.error || "The audit failed. Please try again.");
    }
  }
  throw new Error(
    "The audit is taking longer than usual. If you're signed in, it'll appear in your history when it finishes.",
  );
}

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set<string>(DEFAULT_PERSONA_IDS),
  );
  // Lazy initializer reads sessionStorage once on mount without an effect,
  // avoiding react-hooks/set-state-in-effect cascading-render warnings.
  const [results, setResults] = useState<AuditResponse | null>(readStoredResults);
  const [personaStatuses, setPersonaStatuses] = useState<
    Record<string, PersonaStatus>
  >({});

  // Selected personas in display order — drives both the request and the loading cards.
  const selectedPersonas = PERSONA_IDS.filter((id) => selected.has(id)).map(
    (id) => PERSONA_DATA[id],
  );

  function togglePersona(id: PersonaId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // always leave at least one
      } else if (next.size < MAX_PERSONAS) {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);

    // Animate persona cards: all start pending, then go to running
    const statuses: Record<string, PersonaStatus> = {};
    for (const p of selectedPersonas) {
      statuses[p.id] = "pending";
    }
    setPersonaStatuses({ ...statuses });

    // Stagger the "running" state for visual effect
    for (let i = 0; i < selectedPersonas.length; i++) {
      setTimeout(() => {
        setPersonaStatuses((prev) => ({
          ...prev,
          [selectedPersonas[i].id]: "running",
        }));
      }, i * 600);
    }

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, personaIds: [...selected] }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      if (!data.jobId) {
        setError("Could not queue the audit. Please try again.");
        setLoading(false);
        return;
      }

      // The audit runs in a worker; poll until it finishes.
      const auditResults = await pollAuditJob(data.jobId as string);

      const completed: Record<string, PersonaStatus> = {};
      for (const p of selectedPersonas) {
        completed[p.id] = "complete";
      }
      setPersonaStatuses(completed);

      setResults(auditResults);

      // Persist to sessionStorage so results survive refresh
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auditResults));
      } catch {
        // Storage full or unavailable — results still shown, just won't survive refresh
      }

      // Refresh server components so a signed-in user's new audit appears in
      // their dashboard history immediately. No-op cost on the public landing.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Please try again.",
      );
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

  const atCap = selected.size >= MAX_PERSONAS;

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

      {/* Persona picker */}
      <fieldset className="mt-4" disabled={loading}>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">
          Who tests your site{" "}
          <span className="text-muted-foreground/60">
            ({selected.size} selected, max {MAX_PERSONAS})
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PERSONA_IDS.map((id) => {
            const p = PERSONA_DATA[id];
            const isOn = selected.has(id);
            const disabled = loading || (!isOn && atCap);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePersona(id)}
                disabled={disabled}
                aria-pressed={isOn}
                title={p.description}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isOn
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name} · {p.role}
              </button>
            );
          })}
        </div>
      </fieldset>

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
          {selectedPersonas.map((persona) => {
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
