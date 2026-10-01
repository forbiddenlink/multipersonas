import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradeFindingRow } from "@/components/dossier/grade-finding-row";

function renderRow(fixFirst?: boolean) {
  return render(
    <ul>
      <GradeFindingRow
        ruleId="color-contrast"
        severity="serious"
        help="Elements must meet minimum color contrast ratio thresholds"
        nodes={3}
        wcagAA
        fixFirst={fixFirst}
      />
    </ul>,
  );
}

afterEach(cleanup);

describe("GradeFindingRow fix-first label", () => {
  it("shows the label when the finding is top priority", () => {
    renderRow(true);
    expect(screen.getByText("Fix first")).toBeTruthy();
  });

  it("omits the label by default", () => {
    renderRow();
    expect(screen.queryByText("Fix first")).toBeNull();
  });
});
