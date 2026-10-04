import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RetestButton } from "@/components/retest-button";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function json(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const props = {
  url: "https://example.com/",
  personaIds: ["first-time-visitor", "power-user"],
  projectId: "proj-1",
};

describe("RetestButton", () => {
  it("re-queues the same url, personas and project through the normal audit route", async () => {
    const fetchMock = vi.fn(async () => json({ jobId: "job-1", status: "queued" }, 202));
    vi.stubGlobal("fetch", fetchMock);
    render(<RetestButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(0);
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/audit");
    expect(JSON.parse(init.body as string)).toEqual({
      url: "https://example.com/",
      personaIds: ["first-time-visitor", "power-user"],
      projectId: "proj-1",
    });
  });

  it("omits projectId for a run that has no project", async () => {
    const fetchMock = vi.fn(async () => json({ jobId: "job-1" }, 202));
    vi.stubGlobal("fetch", fetchMock);
    render(<RetestButton url={props.url} personaIds={props.personaIds} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(0);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("projectId");
  });

  it("announces queued, then links to the new run when it finishes", async () => {
    const fetchMock = vi.fn(async (path: string) =>
      path === "/api/audit"
        ? json({ jobId: "job-1" }, 202)
        : json({ status: "completed", result: { runId: "run-9" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RetestButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(0);
    expect(screen.getByRole("status")).toHaveTextContent(/queued/i);
    expect(screen.getByRole("button", { name: /retest/i })).toBeDisabled();
    await advance(2500);
    expect(screen.getByRole("link", { name: "Open the new run" })).toHaveAttribute("href", "/audits/run-9");
  });

  it("shows the server's refusal (rate limit, spend cap, plan) as an alert without queueing twice", async () => {
    const fetchMock = vi.fn(async () => json({ error: "You've reached the audit limit (5 per 10 minutes). Please wait and try again." }, 429));
    vi.stubGlobal("fetch", fetchMock);
    render(<RetestButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(0);
    expect(screen.getByRole("alert")).toHaveTextContent("audit limit");
    expect(screen.getByRole("button", { name: "Retest" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("points a 402 at plans instead of a generic failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ upgrade: true, error: "x" }, 402)));
    render(<RetestButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(0);
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing");
  });

  it("reports a failed retest", async () => {
    vi.stubGlobal("fetch", vi.fn(async (path: string) =>
      path === "/api/audit" ? json({ jobId: "j" }, 202) : json({ status: "failed", error: "Scan failed." })));
    render(<RetestButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Retest" }));
    await advance(2500);
    expect(screen.getByRole("alert")).toHaveTextContent("Scan failed.");
  });
});
