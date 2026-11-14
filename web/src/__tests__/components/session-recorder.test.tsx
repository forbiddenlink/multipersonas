import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SessionRecorder, type RecorderPersona } from "@/components/session-recorder";
import { buildPersonaOutcomes, rankStuckPoints, stuckStepIndexes } from "@/lib/persona-outcomes";

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
  personaId: c.personaId, name: c.name, role: "Shopper", device: "375 x 812 · touch", badge: c.badge,
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
  expect(screen.getByRole("heading", { name: "axe-core findings by page" })).toBeInTheDocument();
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

const live = () => screen.getByTestId("recorder-live");

it("renders role and device under the persona name", () => {
  renderIt();
  expect(screen.getAllByText("Shopper").length).toBe(2);
  expect(screen.getAllByText("375 x 812 · touch").length).toBe(2);
});

it("gives every track one tab stop and moves within it with arrows, Home and End", () => {
  renderIt();
  const stops = (name: string | RegExp) =>
    Array.from(screen.getByRole("group", { name }).querySelectorAll("button")).filter((b) => b.tabIndex === 0);
  expect(stops("Ann steps")).toHaveLength(1);
  expect(stops("Bo steps")).toHaveLength(1);
  expect(stops(/^Findings on /)).toHaveLength(1);

  const bo = screen.getByRole("group", { name: "Bo steps" }).querySelectorAll("button");
  bo[0]!.focus();
  fireEvent.click(bo[0]!);
  fireEvent.keyDown(bo[0]!, { key: "ArrowRight" });
  expect(document.activeElement).toBe(bo[1]);
  expect(bo[1]!.tabIndex).toBe(0);
  expect(bo[0]!.tabIndex).toBe(-1);
  fireEvent.keyDown(bo[1]!, { key: "End" });
  expect(document.activeElement).toBe(bo[2]);
  fireEvent.keyDown(bo[2]!, { key: "ArrowRight" });
  expect(document.activeElement).toBe(bo[2]);
  fireEvent.keyDown(bo[2]!, { key: "Home" });
  expect(document.activeElement).toBe(bo[0]);
  fireEvent.keyDown(bo[0]!, { key: "ArrowLeft" });
  expect(document.activeElement).toBe(bo[0]);
});

it("keeps one always-mounted polite live region and drops aria-live from the visible readout", () => {
  const { container } = renderIt();
  expect(live()).toHaveAttribute("aria-live", "polite");
  expect(live()).toHaveClass("sr-only");
  expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  const bo = screen.getByRole("group", { name: "Bo steps" }).querySelectorAll("button");
  fireEvent.keyDown(bo[0]!, { key: "ArrowRight" });
  expect(live().textContent).toBe("Bo, step 2 of 3, stuck point, click");
  fireEvent.keyDown(bo[1]!, { key: "ArrowRight" });
  expect(live().textContent).toBe("Bo, step 3 of 3, gave up, finish");
});

it("prev and next walk the focused track, not the longest one", () => {
  renderIt();
  const ann = screen.getByRole("group", { name: "Ann steps" }).querySelectorAll("button");
  fireEvent.click(ann[0]!);
  const detail = screen.getByRole("region", { name: "At the cursor" });
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(detail.textContent).toMatch(/Ann, step 2: finish/);
  expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
  expect(detail.textContent).toMatch(/Ann, step 1: navigate/);
  expect((screen.getByRole("slider") as HTMLInputElement).max).toBe("1");
});

it("flags ticks from the same rule as the stuck points list and notes the give-up", () => {
  expect([...stuckStepIndexes(stuck)].sort()).toEqual([1, 2]);
  expect([...stuckStepIndexes(reached)]).toEqual([]);
  renderIt();
  expect(screen.getByRole("button", { name: /Bo, step 3, gave up/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Bo, step 3/ }));
  expect(screen.getByRole("region", { name: "At the cursor" }).textContent).toMatch(/step 3: finish \(gave up\)/);
});

it("keeps the frustration band out of tick labels in text-check mode", () => {
  render(<SessionRecorder personas={personas} headline="h" axePages={[]} axeNotShown={0} taskCheck />);
  const label = screen.getByRole("button", { name: /Bo, step 2/ }).getAttribute("aria-label");
  expect(label).toBe("Bo, step 2, stuck point");
});

it("disables the slider for a one-step journey", () => {
  const one = { personaId: "a", goalCompleted: true, steps: [step(0, "finish", 0, "https://x.test/", "Done.")] };
  render(
    <SessionRecorder
      personas={[{ personaId: "a", name: "Ann", role: "", device: "", badge: "reached", journey: one, notes: [] }]}
      headline="h" axePages={[]} axeNotShown={0} taskCheck={false}
    />,
  );
  expect(screen.getByRole("slider")).toBeDisabled();
});

it("says so with zero personas, and explains an empty axe lane", () => {
  render(<SessionRecorder personas={[]} headline="No persona results recorded" axePages={[]} axeNotShown={3} taskCheck={false} />);
  expect(screen.getByText("This run had no personas.")).toBeInTheDocument();
  expect(screen.getByText("axe-core recorded no findings with a page location.")).toBeInTheDocument();
  expect(screen.getByText(/3 more findings are in the issues table below/)).toBeInTheDocument();
});

it("shows the not-shown note even when lane B has rows", () => {
  render(<SessionRecorder personas={personas} headline="h" axePages={axePages} axeNotShown={1} taskCheck={false} />);
  expect(screen.getByText(/1 more finding is in the issues table below/)).toBeInTheDocument();
  expect(screen.queryByText("axe-core recorded no findings with a page location.")).not.toBeInTheDocument();
});

it("clears a stale persona link when focus moves to the axe lane", () => {
  window.history.replaceState(null, "", "/audits/1?persona=b&step=1");
  renderIt();
  fireEvent.click(screen.getByRole("button", { name: /Critical, button-name/ }));
  expect(window.location.search).toBe("");
});

it("copies a link to the moment, and shows an error when the clipboard fails", async () => {
  renderIt();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Copy a link to this moment" }));
  expect(await screen.findByText("Copied")).toBeInTheDocument();
  expect(writeText).toHaveBeenCalled();
  writeText.mockRejectedValue(new Error("no"));
  fireEvent.click(screen.getByRole("button", { name: "Copy a link to this moment" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy");
});
