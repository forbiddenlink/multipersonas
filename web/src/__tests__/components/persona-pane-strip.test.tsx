import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PersonaPaneStrip } from "@/components/dossier/persona-pane-strip";
import { PERSONA_DATA } from "@/lib/personas";
import { SAMPLE_PANE_PERSONAS, SAMPLE_VERDICTS } from "@/lib/sample-evidence";

afterEach(cleanup);

describe("PersonaPaneStrip", () => {
  it("shows one pane per sample persona, using the engine's persona names", () => {
    render(<PersonaPaneStrip />);
    const panes = screen.getAllByRole("listitem");
    expect(panes).toHaveLength(SAMPLE_PANE_PERSONAS.length);
    SAMPLE_PANE_PERSONAS.forEach((id, i) => {
      expect(within(panes[i]!).getByText(PERSONA_DATA[id].name)).toBeTruthy();
    });
  });

  it("reports the real probe finding for the sample state in every pane", () => {
    render(<PersonaPaneStrip />);
    for (const pane of screen.getAllByRole("listitem")) {
      expect(within(pane).getByText(/^1 issue$/)).toBeTruthy();
      expect(within(pane).getByText(SAMPLE_VERDICTS[0].wcag)).toBeTruthy();
    }
  });

  it("puts the panes in a named, focusable scroller", () => {
    render(<PersonaPaneStrip />);
    const scroller = screen.getByRole("region", { name: /persona panes/i });
    expect(scroller.getAttribute("tabindex")).toBe("0");
  });
});
