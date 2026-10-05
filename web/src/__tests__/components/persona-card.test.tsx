import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PersonaCard } from "@/components/persona-card";
import { elderlyUser } from "@engine/personas/library";

afterEach(cleanup);

describe("PersonaCard", () => {
  it("shows the description as written, not forced into Title Case", () => {
    const persona = elderlyUser;
    render(<PersonaCard persona={persona} />);
    const sentence = persona.description.charAt(0).toUpperCase() + persona.description.slice(1);
    const description = screen.getByText(sentence);
    expect(description.className).not.toMatch(/capitalize/);
  });

  it("starts the description with a capital letter, as a sentence", () => {
    render(<PersonaCard persona={elderlyUser} />);
    expect(screen.getByText(/^A 74-year-old/)).toBeTruthy();
  });

  it("shows every goal in full, with no line clamp", () => {
    const { container } = render(<PersonaCard persona={elderlyUser} />);
    for (const goal of elderlyUser.goals) expect(screen.getByText(goal)).toBeTruthy();
    expect(container.querySelector("[class*='line-clamp']")).toBeNull();
  });
});
