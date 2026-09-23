import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskEvidencePanel } from "@/components/task-evidence";

afterEach(cleanup);
const task = { version: 1, goal: "Find contact information", successText: "Contact our team" };

describe("task evidence", () => {
  it("shows the saved goal and links a verified frame without claiming human success", () => {
    render(<TaskEvidencePanel task={task} runId="run-1" outcomes={[{
      personaId: "first-time-visitor", evidence: { status: "observed", pageUrl: "https://example.com", stepIndex: 3 },
    }]} />);
    expect(screen.getByText(task.goal)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View evidence" })).toHaveAttribute("href", "/audits/run-1?persona=first-time-visitor&evidence=task");
    expect(screen.getByText(/does not prove a transaction/)).toBeInTheDocument();
  });
  it("does not fabricate a frame link for a browser failure", () => {
    render(<TaskEvidencePanel task={task} runId="run-1" outcomes={[{
      personaId: "first-time-visitor", evidence: { status: "inconclusive", pageUrl: "https://example.com", stepIndex: null },
    }]} />);
    expect(screen.getByText(/Could not verify/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("does not turn absent evidence into a pass", () => {
    render(<TaskEvidencePanel task={task} outcomes={[]} />);
    expect(screen.getByText(/No task evidence/)).toBeInTheDocument();
  });
});

it("explains why visible text did not satisfy the configured checks", () => {
  render(<TaskEvidencePanel task={{ ...task, version: 2, requireNewText: true, expectedUrl: "https://example.com/thanks" }} outcomes={[{
    personaId: "first-time-visitor", evidence: { status: "not-observed", pageUrl: "https://example.com/demo", stepIndex: 2,
      checks: { text: "observed", url: "mismatched", newText: "already-present" } },
  }]} />);
  expect(screen.getByText(/Configured checks not met/)).toBeInTheDocument();
  expect(screen.getByText(/URL: did not match/)).toHaveTextContent("text was already present at start");
});
it("does not reuse legacy evidence for a stronger task definition", () => {
  render(<TaskEvidencePanel task={{ ...task, version: 2, requireNewText: true }} outcomes={[{
    personaId: "first-time-visitor", evidence: { status: "observed", pageUrl: "https://example.com", stepIndex: 2 },
  }]} />);
  expect(screen.getByText(/No task evidence/)).toBeInTheDocument();
});

it("preserves a failed profile alongside a verified profile in a contextual run", () => {
  render(<TaskEvidencePanel task={{ ...task, version: 2, requireNewText: true }} outcomes={[
    { personaId: "first-time-visitor", evidence: { status: "observed", pageUrl: "https://example.com", stepIndex: 2, checks: { text: "observed", url: "not-required", newText: "appeared" } } },
    { personaId: "mobile-user", evidence: { status: "inconclusive", pageUrl: "https://example.com", stepIndex: null } },
  ]} />);
  expect(screen.getByText(/All configured checks observed/)).toBeInTheDocument();
  expect(screen.getByText(/Could not verify/)).toBeInTheDocument();
});
