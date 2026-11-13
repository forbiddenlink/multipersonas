import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SessionRecorder, type RecorderPersona } from "@/components/session-recorder";
import { buildPersonaOutcomes, rankStuckPoints } from "@/lib/persona-outcomes";

afterEach(cleanup);

// Fixture journeys, not real persona output.
const step = (n: number, action: string, frustration: number, pageUrl: string, reasoning: string | null = null) => ({
  step: n, action, detail: null, reasoning, pageUrl, screenshotUrl: null, ts: "2026-01-01T00:00:00Z", frustration,
});
const reached = {
  personaId: "a", goalCompleted: true,
  steps: [step(0, "navigate", 5, "https://x.test/"), step(1, "finish", 0, "https://x.test/pay", "Done.")],
};
const stuck = {
  personaId: "b", goalCompleted: false,
  steps: [
    step(0, "navigate", 5, "https://x.test/"),
    step(1, "click", 70, "https://x.test/pay", "I cannot tell which button pays."),
    step(2, "finish", 80, "https://x.test/pay", "Gave up: no pay button."),
  ],
};

const outcomes = buildPersonaOutcomes({
  personaIds: ["a", "b"], journeys: [reached, stuck], taskCheck: false,
  meta: (id) => ({ name: id === "a" ? "Ann" : "Bo", role: "", device: "" }),
});
const personas: RecorderPersona[] = outcomes.cards.map((c) => ({
  personaId: c.personaId, name: c.name, role: c.role, badge: c.badge,
  journey: [reached, stuck].find((j) => j.personaId === c.personaId) ?? null, notes: [],
}));
const axePages = [{
  pageUrl: "https://x.test/pay",
  items: [
    { id: "1", severity: "critical", ruleId: "button-name", title: "Buttons need names", why: null, fix: null, pageUrl: "https://x.test/pay" },
    { id: "2", severity: "minor", ruleId: "region", title: "Use landmarks", why: null, fix: null, pageUrl: "https://x.test/pay" },
  ],
}];

function renderIt() {
  return render(
    <SessionRecorder personas={personas} headline={outcomes.headline} axePages={axePages} axeNotShown={0} taskCheck={false} />,
  );
}

it("labels both lanes and one track per persona with the outcome badge", () => {
  renderIt();
  expect(screen.getByRole("heading", { name: "Persona sessions" })).toBeInTheDocument();
  expect(screen.getAllByText("AI opinion").length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Accessibility scan (axe-core)" })).toBeInTheDocument();
  expect(screen.getByText("Deterministic")).toBeInTheDocument();
  expect(screen.getByText("reached")).toBeInTheDocument();
  expect(screen.getByText("blocked")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Ann steps" }).querySelectorAll("button")).toHaveLength(2);
  expect(screen.getByRole("group", { name: "Bo steps" }).querySelectorAll("button")).toHaveLength(3);
});

it("has a single scrubber and flags the stuck step", () => {
  renderIt();
  expect(screen.getAllByRole("slider")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /Bo, step 2, stuck point/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Ann, step 1, stuck point/ })).not.toBeInTheDocument();
});

it("moves the detail pane with the scrubber and with tick clicks", () => {
  renderIt();
  fireEvent.click(screen.getByRole("button", { name: /Bo, step 2/ }));
  const detail = screen.getByRole("region", { name: "At the cursor" });
  expect(within(detail).getByText(/I cannot tell which button pays/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Critical, button-name/ }));
  expect(within(detail).getByText("Buttons need names")).toBeInTheDocument();
  expect(detail.textContent).toMatch(/Personas that reached this page: Ann, Bo/);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
  expect(within(detail).getByText("Use landmarks")).toBeInTheDocument();
});

it("never labels a persona as disabled", () => {
  const { container } = renderIt();
  expect(container.textContent ?? "").not.toMatch(/disabled user|blind user|simulat/i);
});

it("ranks the stuck page first from the same fixture", () => {
  const ranked = rankStuckPoints([reached, stuck]);
  expect(ranked[0]?.pageUrl).toBe("https://x.test/pay");
  expect(ranked[0]?.blockedPersonaIds).toEqual(["b"]);
});
