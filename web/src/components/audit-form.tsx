"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
function readActiveJob(storageKey = ACTIVE_JOB_KEY): ActiveJob | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(storageKey);
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
function persistActiveJob(job: ActiveJob | null, storageKey = ACTIVE_JOB_KEY) {
  if (typeof window === "undefined") return;
  try {
    if (job) {
      sessionStorage.setItem(storageKey, JSON.stringify(job));
    } else {
      sessionStorage.removeItem(storageKey);
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
async function pollAuditJob(jobId: string, signal?: AbortSignal): Promise<PollOutcome> {
  // A real multi-persona run (browser + axe + LLM per persona) routinely runs several
  // minutes; the old 3-minute deadline made the timeout branch the *default* outcome for
  // genuine scans. Ten minutes covers the worst case, and the worker keeps running past
  // it regardless (a "timeout" only means we stopped watching).
  const deadlineMs = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, 2500));
    if (signal?.aborted) return { status: "timeout" };
    let data: { status?: string; result?: AuditResponse; error?: string };
    try {
      const res = await fetch(`/api/audit/${jobId}`, { signal });
      if (!res.ok) continue;
      data = await res.json();
    } catch (err) {
      // AbortError = navigated away or component unmounted — stop cleanly.
      if (err instanceof DOMException && err.name === "AbortError") {
        return { status: "timeout" };
      }
      // Transient network error (offline blip, dropped connection). The job is still
      // running server-side, so keep polling rather than throwing and freezing the UI.
      continue;
    }
    if (data.status === "completed" && data.result) {
      return { status: "completed", result: data.result };
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

export function AuditForm({
  projectId,
  defaultUrl,
  submitLabel,
}: {
  /** When set, included on the queued job so the worker links the saved run back to
   * this project (see app/api/audit/route.ts, which verifies ownership server-side). */
  projectId?: string;
  /** Prefills the URL field — e.g. a project's own URL on its detail page. */
  defaultUrl?: string;
  /** Button label. Defaults to marketing "Run free audit"; app pages pass "Run audit". */
  submitLabel?: string;
} = {}) {
  const router = useRouter();
  const activeJobStorageKey = projectId ? `${ACTIVE_JOB_KEY}:${projectId}` : ACTIVE_JOB_KEY;
  const abortRef = useRef<AbortController | null>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Distinct from `error`: a 402 from the audit route means personas are a Pro feature, which
  // we surface as an upgrade prompt (with the free grade alternative), not a failure.
  const [upgrade, setUpgrade] = useState(false);
  // Lazy initializer reads sessionStorage once on mount without an effect, avoiding
  // react-hooks/set-state-in-effect cascading-render warnings. An active job is only
  // relevant when there isn't already a completed result to show.
  const [init] = useState(() => {
    // Project results already live in history. Start a fresh task check instead of
    // restoring a completed audit from another project or an older task definition.
    const storedResults = projectId ? null : readStoredResults();
    const activeJob = storedResults ? null : readActiveJob(activeJobStorageKey);
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
    // Abort any in-flight poll before starting a new one.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setTimedOut(false);
    setError(null);
    animatePersonaStatuses(personaIds);

    let outcome: PollOutcome;
    try {
      outcome = await pollAuditJob(jobId, ctrl.signal);
    } catch {
      // Safety net: pollAuditJob already swallows transient network errors, but any
      // unexpected throw here must never leave the spinner stuck (watchJob is called
      // fire-and-forget, so a rejection would otherwise be an unhandled one).
      setLoading(false);
      setTimedOut(true);
      setError(
        "Lost connection while watching the audit. Your scan may still be running — use Check status to retry.",
      );
      return;
    }

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
    persistActiveJob(null, activeJobStorageKey);

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
      if (!projectId) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(outcome.result));
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
    // Abort the poll if the component unmounts before the scan completes.
    return () => { abortRef.current?.abort(); };
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUpgrade(false);
    setResults(null);
    setLoading(true);

    const personaIds = selectedPersonas.map((p) => p.id);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          personaIds,
          ...(projectId ? { projectId } : {}),
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        // Personas are the paid layer. Show the upgrade prompt, not a generic error.
        setUpgrade(true);
        setLoading(false);
        return;
      }

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
      persistActiveJob({ jobId, personaIds }, activeJobStorageKey);

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
    setUrl(defaultUrl ?? "");
    setResults(null);
    setError(null);
    setPersonaStatuses({});
    setPendingJobId(null);
    setTimedOut(false);
    persistActiveJob(null, activeJobStorageKey);
    try {
      if (!projectId) sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (results) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <AuditResults results={results} onReset={handleReset} compact />
      </div>
    );
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
          disabled={loading || !!pendingJobId}
          autoComplete="url"
          aria-label="Website URL to audit"
          className="h-10 flex-1 rounded-sm border border-border bg-card px-4 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 md:text-sm"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading || !!pendingJobId || !url}
          className="h-10 shrink-0 px-6 font-mono text-xs uppercase tracking-wide"
        >
          {loading ? "Running…" : timedOut ? "In progress…" : (submitLabel ?? "Run free audit")}
        </Button>
      </form>

      {/* Persona picker — outline chips, not soft pills */}
      <fieldset className="mt-4" disabled={loading || !!pendingJobId}>
        <legend className="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Who tests your site{" "}
          <span className="normal-case tracking-normal">
            ({selected.size} selected, max {MAX_PERSONAS})
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PERSONA_IDS.map((id) => {
            const p = PERSONA_DATA[id];
            const isOn = selected.has(id);
            const disabled = loading || !!pendingJobId || (!isOn && atCap);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePersona(id)}
                disabled={disabled}
                aria-pressed={isOn}
                title={p.description}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  isOn
                    ? "border-[var(--primary)] text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                }`}
              >
                {p.name} · {p.role}
              </button>
            );
          })}
        </div>
      </fieldset>

      {upgrade && (
        <div
          role="status"
          className="mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm"
        >
          <p className="font-medium">Task-success personas are a Pro feature.</p>
          <p className="mt-1 text-muted-foreground">
            Free accounts get the deterministic accessibility scan. Run a free grade on any
            public page, or ask about Pro to unlock persona task-success runs.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/grade" className="underline underline-offset-4">Run a free grade</Link>
            <Link href="/settings" className="underline underline-offset-4">About Pro</Link>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 text-center">
          {error.includes("audit limit") ? (
            <p className="text-sm" style={{ color: "var(--severity-moderate)" }}>{error}</p>
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      {timedOut && pendingJobId && (
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
        <div
          role="status"
          aria-live="polite"
          className="mt-6 overflow-hidden rounded-md border border-border bg-card font-mono text-sm"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              <span className="select-none text-[var(--primary)]">┌─ </span>
              run log
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full bg-[var(--primary)] motion-safe:animate-pulse"
                aria-hidden
              />
              scanning
            </span>
          </div>
          <ul className="divide-y divide-border">
            {selectedPersonas.map((persona) => {
              const status = personaStatuses[persona.id] || "pending";
              const statusLabel =
                status === "pending"
                  ? "queued"
                  : status === "running"
                    ? "browsing…"
                    : "done";
              return (
                <li
                  key={persona.id}
                  className={`flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors duration-300 ${
                    status === "pending" ? "text-muted-foreground" : "text-card-foreground"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <span className="select-none text-[var(--primary)]">›&nbsp;</span>
                    <span className="text-muted-foreground">[persona:{persona.id}]</span>{" "}
                    {persona.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${
                      status === "running"
                        ? "text-[var(--primary)]"
                        : status === "complete"
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
