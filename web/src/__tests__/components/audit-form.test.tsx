import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { AuditForm } from "@/components/audit-form";
import type { AuditResponse } from "@/components/audit-results";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const ACTIVE_JOB_KEY = "personaudit-active-job";
const RESULTS_KEY = "personaudit-last-audit";

const auditResponse: AuditResponse = {
  url: "https://example.com",
  taskSuccess: { achieved: 1, total: 1 },
  personas: [],
  axeFindings: [],
  conflicts: [],
};

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response;
}

/** Advance the fake clock and flush the microtasks/state updates it triggers.
 * NOTE: with fake timers active, `findBy*`/`waitFor` never resolve (their retry
 * loop is itself timer-driven), so assertions after this use plain `getBy`/`queryBy` —
 * the DOM is already settled by the time `advance()` returns. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AuditForm — resume from an active job", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("clears an inaccessible URL job instead of polling another account's job", async () => {
    window.history.replaceState(null, "", "/?job=other-account-job");
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditForm userId="user-b" />);
    await advance(2500);
    expect(screen.getByText("This audit is unavailable for this account. Start a new audit or sign in to the account that created it.")).toBeInTheDocument();
    expect(screen.getByLabelText("Website URL to audit")).toBeEnabled();
    expect(window.location.search).not.toContain("job=");
    await advance(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stores and clears completed results only for the current account", async () => {
    sessionStorage.setItem(`${ACTIVE_JOB_KEY}:user-b`, JSON.stringify({ jobId: "own-job", personaIds: [] }));
    sessionStorage.setItem(`${RESULTS_KEY}:user-a`, JSON.stringify(auditResponse));
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: "completed", result: auditResponse })));
    render(<AuditForm userId="user-b" />);
    await advance(2500);
    expect(sessionStorage.getItem(`${RESULTS_KEY}:user-b`)).toBe(JSON.stringify(auditResponse));
    expect(sessionStorage.getItem(RESULTS_KEY)).toBeNull();
    expect(sessionStorage.getItem(`${ACTIVE_JOB_KEY}:user-b`)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /run another audit/i }));
    expect(sessionStorage.getItem(`${RESULTS_KEY}:user-b`)).toBeNull();
    expect(sessionStorage.getItem(`${RESULTS_KEY}:user-a`)).toBe(JSON.stringify(auditResponse));
  });

  it("keeps the current poll running when Strict Mode cleans up the first effect", async () => {
    sessionStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify({ jobId: "strict-job", personaIds: ["first-time-visitor"] }));
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: "running" })));
    render(<StrictMode><AuditForm /></StrictMode>);
    await advance(2500);
    expect(screen.queryByRole("button", { name: /check status/i })).not.toBeInTheDocument();
    expect(screen.getByText("scanning")).toBeInTheDocument();
  });

  it.each([{}, { jobId: "stale-job" }, { jobId: 7, personaIds: [] }])(
    "ignores malformed saved jobs and resumes the URL job instead: %j",
    async (stored) => {
      sessionStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(stored));
      window.history.replaceState(null, "", "/?job=valid-job");
      const fetchMock = vi.fn(async () => jsonResponse({ status: "completed", result: auditResponse }));
      vi.stubGlobal("fetch", fetchMock);
      render(<AuditForm />);
      await advance(2500);
      expect(fetchMock).toHaveBeenCalledWith("/api/audit/valid-job", expect.anything());
      expect(screen.getByText("https://example.com")).toBeInTheDocument();
    },
  );

  it("resumes polling a jobId persisted in sessionStorage instead of showing a fresh form, and never re-submits", async () => {
    sessionStorage.setItem(
      ACTIVE_JOB_KEY,
      JSON.stringify({ jobId: "job-resume-1", personaIds: ["first-time-visitor"] }),
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/audit/job-resume-1") {
        return jsonResponse({ status: "completed", result: auditResponse });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);
    // The resume kickoff is deferred a microtask (see audit-form.tsx); let it flush.
    await act(async () => {});

    // Resume kicks in immediately on mount — the form is disabled/loading, not a
    // fresh empty form waiting for the user to submit again.
    expect(screen.getByLabelText("Website URL to audit")).toBeDisabled();

    await advance(2500);

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run another audit/i })).toBeInTheDocument();

    // Resumed jobs must only ever poll — never hit the enqueue endpoint.
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).not.toBe("/api/audit");
    }
    // Terminal state: the persisted job is cleared once results render.
    expect(sessionStorage.getItem(ACTIVE_JOB_KEY)).toBeNull();
    expect(window.location.search).not.toContain("job=");
  });

  it("resumes from the ?job= URL param when sessionStorage has no active job", async () => {
    window.history.replaceState(null, "", "/?job=job-from-url");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/audit/job-from-url") {
        return jsonResponse({ status: "completed", result: auditResponse });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);
    await advance(2500);

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("does not resume when a completed result is already stored", async () => {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(auditResponse));
    sessionStorage.setItem(
      ACTIVE_JOB_KEY,
      JSON.stringify({ jobId: "job-should-not-poll", personaIds: ["first-time-visitor"] }),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);
    await advance(2500);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });
});

describe("AuditForm — client poll deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("keeps the jobId (does not discard it) when the ~10-min deadline is hit, and 'Check status' re-polls without re-submitting", async () => {
    let pollCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/audit" && init?.method === "POST") {
        return jsonResponse({ jobId: "job-timeout-1" });
      }
      if (url === "/api/audit/job-timeout-1") {
        pollCount++;
        // Never completes within the deadline.
        return jsonResponse({ status: "running" });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);

    const input = screen.getByLabelText("Website URL to audit");
    fireEvent.change(input, { target: { value: "https://example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /run free audit/i }));
    });

    // Exhaust the ~10-min client deadline.
    await advance(10 * 60 * 1000 + 5000);

    // Recoverable state, not a lost scan.
    const status = screen.getByText(/still running/i);
    expect(status.closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check status/i })).toBeInTheDocument();

    // Job must still be recoverable — never discarded on timeout.
    expect(sessionStorage.getItem(ACTIVE_JOB_KEY)).toContain("job-timeout-1");
    expect(window.location.search).toContain("job=job-timeout-1");

    const pollCountAtTimeout = pollCount;
    const postCallsAtTimeout = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/audit" && (c[1] as RequestInit)?.method === "POST",
    ).length;

    // Manual re-check must re-poll the SAME job, never re-submit (anon quota is 1/hour).
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /check status/i }));
    });
    await advance(2500);

    expect(pollCount).toBeGreaterThan(pollCountAtTimeout);
    const postCallsAfter = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/audit" && (c[1] as RequestInit)?.method === "POST",
    ).length;
    expect(postCallsAfter).toBe(postCallsAtTimeout);
  });
});

describe("AuditForm — dead auth-signup branch removed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders a plain error, not the signup link, even if the error text matches the old string", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "Authentication required" }, false),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);

    const input = screen.getByLabelText("Website URL to audit");
    fireEvent.change(input, { target: { value: "https://example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /run free audit/i }));
    });

    expect(screen.getByText("Authentication required")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /create a free account/i }),
    ).not.toBeInTheDocument();
  });
});

describe("AuditForm — saved project task retests", () => {
  it("does not display another account's cached results after switching accounts", () => {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(auditResponse));
    sessionStorage.setItem(`${RESULTS_KEY}:user-a`, JSON.stringify(auditResponse));
    render(<AuditForm userId="user-b" submitLabel="Run audit" />);
    expect(screen.queryByText("https://example.com")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Website URL to audit")).toBeInTheDocument();
  });

  it("restores only the signed-in account's own cached results", () => {
    sessionStorage.setItem(`${RESULTS_KEY}:user-a`, JSON.stringify(auditResponse));
    render(<AuditForm userId="user-a" submitLabel="Run audit" />);
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("does not restore another project's completed result or active job", async () => {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(auditResponse));
    sessionStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify({ jobId: "another-project", personaIds: ["first-time-visitor"] }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditForm projectId="project-1" defaultUrl="https://example.com/task" submitLabel="Test saved task" />);
    await act(async () => {});
    expect(screen.getByLabelText("Website URL to audit")).toHaveValue("https://example.com/task");
    expect(screen.getByRole("button", { name: /Test saved task/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains the project's URL when starting another test", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem(`${ACTIVE_JOB_KEY}:project-1`, JSON.stringify({ jobId: "project-task", personaIds: ["first-time-visitor"] }));
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: "completed", result: auditResponse })));
    render(<AuditForm projectId="project-1" defaultUrl="https://example.com/task" submitLabel="Test saved task" />);
    await advance(2500);
    fireEvent.click(screen.getByRole("button", { name: /run another audit/i }));
    expect(screen.getByLabelText("Website URL to audit")).toHaveValue("https://example.com/task");
    expect(sessionStorage.getItem(`${ACTIVE_JOB_KEY}:project-1`)).toBeNull();
  });
});

describe("AuditForm — honest progress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("shows only the status the job reported, never a timed per-persona 'browsing' state", async () => {
    sessionStorage.setItem(
      ACTIVE_JOB_KEY,
      JSON.stringify({ jobId: "j1", personaIds: ["first-time-visitor", "keyboard-only"] }),
    );
    const statuses = ["queued", "queued", "running"];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: statuses.shift() ?? "running" })));
    render(<AuditForm />);
    await act(async () => {});
    expect(screen.getByText("checking status")).toBeInTheDocument();
    await advance(2500);
    expect(screen.getByText("queued")).toBeInTheDocument();
    await advance(5000);
    expect(screen.getByText("scanning")).toBeInTheDocument();
    expect(screen.queryByText(/browsing/i)).not.toBeInTheDocument();
    expect(screen.queryByText("done")).not.toBeInTheDocument();
  });
});

describe("AuditForm — free account upgrade copy", () => {
  it("tells a 402 caller only what is true and names the real plans", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 402, json: async () => ({}) }) as Response));
    render(<AuditForm />);
    fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: "https://example.com" } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText("Website URL to audit").closest("form")!);
    });
    const note = await screen.findByText(/hosted runs come with the solo and agency founding plans/i);
    const box = note.closest('[role="status"]')!;
    expect(box.textContent).not.toMatch(/\bPro\b/);
    expect(box.textContent).not.toMatch(/deterministic accessibility scan/i);
    expect(screen.getByRole("link", { name: "Scan with the CLI" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Run a free grade" })).toHaveAttribute("href", "/grade");
  });
});
