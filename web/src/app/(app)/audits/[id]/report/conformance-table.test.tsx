// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConformanceTable } from "./conformance-table";
import { buildConformance } from "@/lib/conformance";

const META = {
  "does-not-support": { label: "Does Not Support", color: "#b91c1c" },
  "partially-supports": { label: "Partially Supports", color: "#a16207" },
  "needs-manual-review": { label: "Needs Manual Review", color: "#4b5563" },
};

describe("ConformanceTable", () => {
  it("renders every criterion row with its code, level, status and remarks", () => {
    const catalog = [
      { code: "1.1.1", level: "A" as const, name: "Non-text Content" },
      { code: "1.4.3", level: "AA" as const, name: "Contrast (Minimum)" },
      { code: "2.4.5", level: "AA" as const, name: "Multiple Ways" },
    ];
    const summary = buildConformance(
      [{ criteria: [{ code: "1.4.3", name: "Contrast (Minimum)" }] }],
      catalog,
      new Set(["1.1.1", "1.4.3"]),
    );
    expect(summary.rows).toHaveLength(3);
    const html = renderToStaticMarkup(<ConformanceTable rows={summary.rows} meta={META} />);
    const rowCount = (html.match(/<tr[ >]/g) ?? []).length;
    expect(rowCount).toBe(summary.rows.length + 1); // + header row
    for (const row of summary.rows) {
      expect(html).toContain(`<strong>${row.code}</strong>`);
      expect(html).toContain(META[row.status].label);
      if (row.remarks) expect(html).toContain(row.remarks.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
    }
  });
});
