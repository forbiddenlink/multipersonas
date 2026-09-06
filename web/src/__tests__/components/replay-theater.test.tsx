import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReplayTheater } from "@/components/replay-theater";

const journeys = [{
  personaId: "test-persona", goalCompleted: true,
  steps: [{ step: 0, action: "finish", detail: null, reasoning: null, pageUrl: "https://example.com",
    screenshotUrl: null, ts: "2026-01-01T00:00:00Z", frustration: 0 }],
}];

afterEach(cleanup);

it.each(["denied", "unavailable"])("reports clipboard %s with manual link copy guidance", async (state) => {
  Object.assign(navigator, {
    clipboard: state === "denied"
      ? { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) }
      : undefined,
  });
  render(<ReplayTheater journeys={journeys} personaMeta={{}} findingsByUrl={{}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy a link to this moment" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy. Copy the link from your browser's address bar.");
});
