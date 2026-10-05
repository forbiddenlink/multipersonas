import { describe, expect, it } from "vitest";
import { buttonVariants } from "@/components/ui/button";

// Links styled with buttonVariants() (no <Button>) must resolve Tailwind conflicts the
// same way <Button> does. Unmerged, base `border-transparent` beat the outline border and
// "Export accessibility report" rendered as borderless text.
describe("buttonVariants", () => {
  it("lets the outline variant's border win over the base transparent border", () => {
    const cls = buttonVariants({ variant: "outline", size: "lg" }).split(/\s+/);
    expect(cls).toContain("border-foreground/60");
    expect(cls).not.toContain("border-transparent");
  });

  it("keeps a caller className over the variant default", () => {
    const cls = buttonVariants({ variant: "outline", className: "h-12" }).split(/\s+/);
    expect(cls).toContain("h-12");
    expect(cls).not.toContain("h-9");
  });
});
