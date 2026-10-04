import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Wordmark } from "@/components/forensic/wordmark";

afterEach(cleanup);

it("exposes the name exactly once to assistive tech and to text extraction", () => {
  const { container } = render(<Wordmark />);
  expect(container.textContent).toBe("Personaudit");
  expect(container.querySelector(".sr-only")).toBeNull();
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});
