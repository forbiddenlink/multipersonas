"use client";

import { useEffect, useState } from "react";
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

const STORAGE_KEY = "personaudit-last-audit";
const ACTIVE_JOB_KEY = "personaudit-active-job";
const JOB_QUERY_PARAM = "job";

type PersonaStatus = "pending" | "running" | "complete";

interface ActiveJob {
  jobId: string;
  personaIds: string[];
}

function readStoredResults(): AuditResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AuditResponse) : null;
  } catch {
    return null;
  }
}

/** Read an in-flight job's id, preferring sessionStorage (survives a refresh) and
 * falling back to the ?job= URL param (survives a copy/pasted or shared link). */
function readActiveJob(): ActiveJob | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(ACTIVE_JOB_KEY);
    if (saved) return JSON.parse(saved) as ActiveJob;
  } catch {
    // ignore malformed storage
  }
  try {
    const jobId = new URLSearchParams(window.location.search).get(JOB_QUERY_PARAM);
    if (jobId) return { jobId, personaIds: [...DEFAULT_PERSONA_IDS] };
  } catch {
    // ignore
  }
  return null;
}

/** Persist (or clear) the active job so neither a refresh nor the ~3-min client
 * poll deadline can strand an anon scan the 1/hour quota won't let you resubmit. */
function persistActiveJob(job: ActiveJob | null) {
  if (typeof window === "undefined") return;
  try {
    if (job) {
      sessionStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job));
    } else {
      sessionStorage.removeItem(ACTIVE_JOB_KEY);
    }
  } catch {
    // Storage full or unavailable — resume-on-refresh just won't work this session
  }
  try {
    const url = new URL(window.location.href);
    if (job) {
      url.searchParams.set(JOB_QUERY_PARAM, job.jobId);
    } else {
      url.searchParams.delete(JOB_QUERY_PARAM);
    }
    window.history.replaceState(null, "", url);
  } catch {
    // ignore (e.g. a test environment without a full History API)
  }
}

type PollOutcome =
  | { status: "completed"; result: AuditResponse }
  | { status: "failed"; error: string }
  | { status: "timeout" };

/** Poll a queued audit job until it completes, fails, or the client-side deadline
 * passes. The run happens in a worker, not the request, so the browser can take as
 * long as it needs — a "timeout" outcome means we stopped watching, not that the job
 * died, so the caller decides whether to keep the jobId around for a manual re-check. */
async function pollAuditJob(jobId: string): Promise<PollOutcome> {
  const deadlineMs = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`/api/audit/${jobId}`);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "completed" && data.result) {
      return { status: "completed", result: data.result as AuditResponse };
    }
    if (data.status === "failed") {
      return {
        status: "failed",
        error: data.error || "The audit failed. Please try again.",
      };
    }
  }
  return { status: "timeout" };
}

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lazy initializer reads sessionStorage once on mount without an effect, avoiding
  // react-hooks/set-state-in-effect cascading-render warnings. An active job is only
  // relevant when there isn't already a completed result to show.
  const [init] = useState(() => {
    const storedResults = readStoredResults();
    const activeJob = storedResults ? null : readActiveJob();
    return { storedResults, activeJob };
  });
  const [selected, setSelected] = useState<Set<string>>(() => {
    const personaIds = init.activeJob?.personaIds.length
      ? init.activeJob.personaIds
      : DEFAULT_PERSONA_IDS;
    return new Set<string>(personaIds);
  });
  const [results, setResults] = useState<AuditResponse | null>(() => init.storedResults);
  const [personaStatuses, setPersonaStatuses] = useState<
    Record<string, PersonaStatus>
  >({});
  // Set once a job is enqueued (or resumed after a refresh) and cleared on a
  // terminal state. A non-null value lets "Check status" re-poll the SAME job
  // instead of re-submitting, which matters because anon audits are capped at 1/hour.
  const [pendingJobId, setPendingJobId] = useState<string | null>(
    () => init.activeJob?.jobId ?? null,
  );
  // The ~3-min client poll deadline was hit; the job is still running server-side.
  const [timedOut, setTimedOut] = useState(false);

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

  /** Animate persona cards: all start pending, then stagger into "running". */
  function animatePersonaStatuses(personaIds: string[]) {
    const statuses: Record<string, PersonaStatus> = {};
    for (const id of personaIds) {
      statuses[id] = "pending";
    }
    setPersonaStatuses(statuses);

    personaIds.forEach((id, i) => {
      setTimeout(() => {
        setPersonaStatuses((prev) => ({ ...prev, [id]: "running" }));
      }, i * 600);
    });
  }

  /** Poll `jobId` to completion. Shared by a fresh submit, a mount-time resume, and
   * a manual "Check status" click so none of those paths can ever re-submit. */
  async function watchJob(jobId: string, personaIds: string[]) {
    setLoading(true);
    setTimedOut(false);
    setError(null);
    animatePersonaStatuses(personaIds);

    const outcome = await pollAuditJob(jobId);

    if (outcome.status === "timeout") {
      // Keep the jobId persisted — the scan is still running server-side, and
      // discarding it here would strand the anon hourly quota unrecoverably.
      setLoading(false);
      setTimedOut(true);
      return;
    }

    // Terminal state (completed or failed): nothing left to resume.
    setLoading(false);
    setPendingJobId(null);
    persistActiveJob(null);

    if (outcome.status === "failed") {
      setError(outcome.error);
      return;
    }

    const completed: Record<string, PersonaStatus> = {};
    for (const id of personaIds) {
      completed[id] = "complete";
    }
    setPersonaStatuses(completed);

    setResults(outcome.result);

    // Persist to sessionStorage so results survive refresh
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(outcome.result));
    } catch {
      // Storage full or unavailable — results still shown, just won't survive refresh
    }

    // Refresh server components so a signed-in user's new audit appears in
    // their dashboard history immediately. No-op cost on the public landing.
    router.refresh();
  }

  // On mount, resume an in-flight job (refresh mid-scan, or the deadline having
  // been hit last visit) instead of showing a fresh empty form. `selected` and
  // `pendingJobId` are already seeded from the same job via lazy initializers above;
  // this effect only starts the actual poll (an external network operation), so it
  // has nothing to set synchronously itself.
  useEffect(() => {
    if (!init.activeJob) return;
    const { jobId, personaIds: storedPersonaIds } = init.activeJob;
    const personaIds = storedPersonaIds.length ? storedPersonaIds : [...DEFAULT_PERSONA_IDS];
    // Deferred a tick: watchJob sets state synchronously at its start (to show the
    // loading UI without a stale-content frame), which react-hooks/set-state-in-effect
    // flags when called directly from an effect body — queueMicrotask moves the call
    // into its own callback, matching the rule's "setState in a callback" escape hatch.
    queueMicrotask(() => {
      void watchJob(jobId, personaIds);
    });
    // Resume-on-mount only — intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckStatus() {
    if (!pendingJobId) return;
    void watchJob(
      pendingJobId,
      selectedPersonas.map((p) => p.id),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);

    const personaIds = selectedPersonas.map((p) => p.id);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, personaIds }),
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

      const jobId = data.jobId as string;
      setPendingJobId(jobId);
      persistActiveJob({ jobId, personaIds });

      // The audit runs in a worker; poll until it finishes.
      await watchJob(jobId, personaIds);
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Please try again.",
      );
    }
  }

  function handleReset() {
    setUrl("");
    setResults(null);
    setError(null);
    setPersonaStatuses({});
    setPendingJobId(null);
    setTimedOut(false);
    persistActiveJob(null);
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
          <span className="text-muted-foreground">
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
          {error.includes("audit limit") ? (
            <p className="text-sm" style={{ color: "var(--severity-moderate)" }}>{error}</p>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      {timedOut && (
        <div role="status" className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Still running — this can take a few minutes. Check back or refresh; we&apos;ll pick it up.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleCheckStatus}
          >
            Check status
          </Button>
        </div>
      )}

      {loading && (
        <div role="status" aria-live="polite" className="mt-8 grid gap-4 sm:grid-cols-3">
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
                <p className="mt-1 text-xs text-muted-foreground">
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
