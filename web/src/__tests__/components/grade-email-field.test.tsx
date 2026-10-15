import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GradeForm } from "@/components/grade-form";
import { GradePoll } from "@/components/grade-poll";
import { trackProductEvent } from "@/lib/analytics";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  trackProductEvent: vi.fn(),
}));

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADDRESS = "visitor@example.com";

function res(data: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 400, json: async () => data } as Response;
}

/** Route fetches by URL so the "is the field offered" probe and the real posts can differ. */
function stubFetch(enabled: boolean | "error", post: (url: string, init: RequestInit) => Response = () => res({ token: TOKEN })) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/grade/email" && (!init || !init.method)) {
      if (enabled === "error") throw new Error("offline");
      return res({ enabled });
    }
    return post(url, init ?? {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const bodiesTo = (fetchMock: ReturnType<typeof stubFetch>, url: string) =>
  fetchMock.mock.calls
    .filter(([u, init]) => u === url && (init as RequestInit | undefined)?.method === "POST")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function ready() {
  await act(async () => {});
}

describe("GradeForm email field", () => {
  it("is hidden until the server says it can send (fail closed)", async () => {
    stubFetch(false);
    render(<GradeForm />);
    await ready();
    expect(screen.queryByLabelText(/email me this grade/i)).not.toBeInTheDocument();
  });

  it("stays hidden if the probe fails", async () => {
    stubFetch("error");
    render(<GradeForm />);
    await ready();
    expect(screen.queryByLabelText(/email me this grade/i)).not.toBeInTheDocument();
  });

  it("is offered as clearly optional when the server can send", async () => {
    stubFetch(true);
    render(<GradeForm />);
    const field = await screen.findByLabelText(/email me this grade/i);
    expect(field).not.toBeRequired();
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("grades without an email by default, sending no email key at all", async () => {
    const fetchMock = stubFetch(true);
    render(<GradeForm />);
    await screen.findByLabelText(/email me this grade/i);
    fireEvent.change(screen.getByLabelText("Public website URL"), { target: { value: "example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });
    expect(bodiesTo(fetchMock, "/api/grade")).toEqual([{ url: "https://example.com/" }]);
    expect(push).toHaveBeenCalledWith(`/grade/${TOKEN}`);
    expect(trackProductEvent).not.toHaveBeenCalledWith("grade_email_requested", expect.anything());
  });

  it("sends the normalised address with the grade and tracks the request without it", async () => {
    const fetchMock = stubFetch(true, () => res({ token: TOKEN, emailStatus: "saved" }));
    render(<GradeForm />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: " Visitor@Example.com " } });
    fireEvent.change(screen.getByLabelText("Public website URL"), { target: { value: "example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });
    expect(bodiesTo(fetchMock, "/api/grade")).toEqual([{ url: "https://example.com/", email: ADDRESS }]);

    const calls = vi.mocked(trackProductEvent).mock.calls.filter(([e]) => e === "grade_email_requested");
    expect(calls).toEqual([["grade_email_requested", { surface: "form", outcome: "saved" }]]);
  });

  it("never sends the address to analytics, in any event", async () => {
    stubFetch(true, () => res({ token: TOKEN, emailStatus: "saved" }));
    render(<GradeForm />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: ADDRESS } });
    fireEvent.change(screen.getByLabelText("Public website URL"), { target: { value: "example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });
    expect(JSON.stringify(vi.mocked(trackProductEvent).mock.calls)).not.toMatch(/visitor|@/);
  });

  it("blocks a malformed address in the page, before any grade is queued", async () => {
    const fetchMock = stubFetch(true);
    render(<GradeForm />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText("Public website URL"), { target: { value: "example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/valid email address/i);
    expect(bodiesTo(fetchMock, "/api/grade")).toHaveLength(0);
  });
});

describe("GradePoll email capture", () => {
  it("is hidden when the server cannot send", async () => {
    stubFetch(false);
    render(<GradePoll token={TOKEN} status="running" />);
    await ready();
    expect(screen.queryByLabelText(/email me this grade/i)).not.toBeInTheDocument();
  });

  it("lets a visitor leave: posts the token and address, then confirms", async () => {
    const fetchMock = stubFetch(true, () => res({ status: "saved" }));
    render(<GradePoll token={TOKEN} status="queued" />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: ADDRESS } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me/i }));
    });
    expect(bodiesTo(fetchMock, "/api/grade/email")).toEqual([{ token: TOKEN, email: ADDRESS }]);
    await waitFor(() => expect(screen.getByText(/we will send one email/i)).toBeInTheDocument());
    expect(vi.mocked(trackProductEvent).mock.calls).toContainEqual(["grade_email_requested", { surface: "poll", outcome: "saved" }]);
    expect(JSON.stringify(vi.mocked(trackProductEvent).mock.calls)).not.toMatch(/visitor|@/);
  });

  it("shows the server's reason when the request is refused", async () => {
    stubFetch(true, () => res({ error: "Too many email requests. Please try again later." }, false));
    render(<GradePoll token={TOKEN} status="running" />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: ADDRESS } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me/i }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/too many email requests/i);
    expect(trackProductEvent).not.toHaveBeenCalledWith("grade_email_requested", expect.anything());
  });

  it("rejects a malformed address without calling the API", async () => {
    const fetchMock = stubFetch(true);
    render(<GradePoll token={TOKEN} status="running" />);
    fireEvent.change(await screen.findByLabelText(/email me this grade/i), { target: { value: "nope" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me/i }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(bodiesTo(fetchMock, "/api/grade/email")).toHaveLength(0);
  });
});
