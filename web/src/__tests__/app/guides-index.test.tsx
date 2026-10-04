import { cleanup, render, screen } from "@testing-library/react";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => null }));
import GuidesIndexPage from "@/app/guides/page";

afterEach(cleanup);

describe("/guides index", () => {
  it("links every guide that exists under app/guides", () => {
    const dir = path.join(process.cwd(), "src/app/guides");
    const slugs = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "page.tsx")))
      .map((e) => e.name);
    expect(slugs.length).toBeGreaterThanOrEqual(5);
    render(<GuidesIndexPage />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const slug of slugs) expect(hrefs).toContain(`/guides/${slug}`);
  });
});
