import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AuditForm } from "@/components/audit-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

const acme = { id: "p-acme", name: "acme.test", url: "https://acme.test/" };
const beta = { id: "p-beta", name: "Beta", url: "https://beta.test/" };

function stubFetch() {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 202, json: async () => ({ jobId: "job-1" }) }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit(url: string) {
  fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: url } });
  await act(async () => {
    fireEvent.submit(screen.getByLabelText("Website URL to audit").closest("form")!);
  });
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("AuditForm project picker (dashboard)", () => {
  it("defaults to the project whose site matches the URL and sends its id", async () => {
    const fetchMock = stubFetch();
    render(<AuditForm userId="u" projects={[beta, acme]} projectLimit={5} />);
    fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: "https://www.acme.test/pricing" } });
    expect(screen.getByLabelText("Save to project")).toHaveValue("p-acme");
    await submit("https://www.acme.test/pricing");
    expect(sentBody(fetchMock)).toMatchObject({ projectId: "p-acme" });
    expect(sentBody(fetchMock)).not.toHaveProperty("newProject");
  });

  it("offers a new project for the site when none matches and the plan has room", async () => {
    const fetchMock = stubFetch();
    render(<AuditForm userId="u" projects={[beta]} projectLimit={5} />);
    fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: "https://new.test/" } });
    expect(screen.getByLabelText("Save to project")).toHaveValue("new");
    expect(screen.getByRole("option", { name: "New project for new.test" })).toBeInTheDocument();
    await submit("https://new.test/");
    const body = sentBody(fetchMock);
    expect(body.newProject).toBe(true);
    expect(body).not.toHaveProperty("projectId");
  });

  it("says so, and saves without a project, when the plan's project cap blocks a new one", async () => {
    const fetchMock = stubFetch();
    render(<AuditForm userId="u" projects={[acme, beta]} projectLimit={2} />);
    fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: "https://new.test/" } });
    expect(screen.getByLabelText("Save to project")).toHaveValue("none");
    expect(screen.queryByRole("option", { name: /New project/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Your plan includes 2 projects/)).toBeInTheDocument();
    expect(screen.getByText(/saved without a project/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    await submit("https://new.test/");
    const body = sentBody(fetchMock);
    expect(body).not.toHaveProperty("projectId");
    expect(body).not.toHaveProperty("newProject");
  });

  it("keeps an explicit choice when the URL changes", async () => {
    const fetchMock = stubFetch();
    render(<AuditForm userId="u" projects={[acme, beta]} projectLimit={5} />);
    fireEvent.change(screen.getByLabelText("Website URL to audit"), { target: { value: "https://acme.test/" } });
    fireEvent.change(screen.getByLabelText("Save to project"), { target: { value: "p-beta" } });
    await submit("https://acme.test/checkout");
    expect(sentBody(fetchMock)).toMatchObject({ projectId: "p-beta" });
  });

  it("shows no picker on a project page or when no project list is passed", () => {
    const { rerender } = render(<AuditForm userId="u" projectId="p-acme" projects={[acme]} projectLimit={5} />);
    expect(screen.queryByLabelText("Save to project")).not.toBeInTheDocument();
    rerender(<AuditForm userId="u" />);
    expect(screen.queryByLabelText("Save to project")).not.toBeInTheDocument();
  });

  it("shows the server's project-limit message as an alert", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: "Your plan includes 5 projects. See pricing to add more.", code: "project_limit" }),
    }) as Response));
    render(<AuditForm userId="u" projects={[]} projectLimit={5} />);
    await submit("https://new.test/");
    expect(screen.getByRole("alert")).toHaveTextContent("Your plan includes 5 projects");
  });
});
