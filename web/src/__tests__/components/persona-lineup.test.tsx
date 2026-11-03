import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEVERITY_CAPS } from "@engine/grader/score";
import { PersonaLineup } from "@/components/dossier/persona-lineup";
import { EXAMPLE_PAGE, exampleGrade, outlineLines, tabOrder } from "@/lib/example-page";
import { PERSONA_DATA } from "@/lib/personas";
import { SAMPLE_PANE_PERSONAS, SAMPLE_VERDICTS } from "@/lib/sample-evidence";

afterEach(cleanup);

describe("PersonaLineup", () => {
  it("shows one panel per sample persona, using the engine's persona names", () => {
    render(<PersonaLineup />);
    const panels = screen.getAllByRole("listitem");
    expect(panels).toHaveLength(SAMPLE_PANE_PERSONAS.length);
    SAMPLE_PANE_PERSONAS.forEach((id, i) => {
      expect(within(panels[i]!).getByText(PERSONA_DATA[id].name)).toBeTruthy();
    });
  });

  it("reports the real probe finding in every panel", () => {
    render(<PersonaLineup />);
    for (const panel of screen.getAllByRole("listitem")) {
      expect(within(panel).getByText(/^1 issue$/)).toBeTruthy();
      expect(within(panel).getByText(SAMPLE_VERDICTS[0].wcag)).toBeTruthy();
    }
  });

  it("labels the example page and the sample grade", () => {
    render(<PersonaLineup />);
    expect(screen.getByText("Example page, sample grade")).toBeTruthy();
    expect(screen.getByText("Sample grade: C")).toBeTruthy();
  });

  it("puts the panels in a named, focusable scroller", () => {
    render(<PersonaLineup />);
    const scroller = screen.getByRole("region", { name: /persona panels/i });
    expect(scroller.getAttribute("tabindex")).toBe("0");
  });
});

describe("example page", () => {
  it("numbers the Tab order from the page's own nodes", () => {
    const order = tabOrder();
    const tabbable = EXAMPLE_PAGE.nodes.filter((n) => n.tabbable).map((n) => n.id);
    expect([...order.keys()]).toEqual(tabbable);
    expect([...order.values()]).toEqual(tabbable.map((_, i) => i + 1));
  });

  it("outlines the unnamed button as a bare button, the way the finding describes it", () => {
    const lines = outlineLines();
    expect(lines.filter((l) => l.fault)).toHaveLength(1);
    expect(lines.find((l) => l.fault)!.text).toMatch(/^- button \[ref=e\d+\]$/);
  });

  it("earns its letter from the engine's scorer: one critical failure caps the grade at C", () => {
    const grade = exampleGrade();
    expect(grade.grade).toBe("C");
    expect(grade.cappedBy).toEqual(SEVERITY_CAPS.find((c) => c.impact === "critical"));
    expect(grade.rules[0]!.id).toBe(SAMPLE_VERDICTS[0].ruleId);
  });
});
