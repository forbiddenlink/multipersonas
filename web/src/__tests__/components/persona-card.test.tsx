import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PersonaCard } from "@/components/persona-card";
import { elderlyUser } from "@engine/personas/library";

afterEach(cleanup);

describe("PersonaCard", () => {
  it("shows the description as written, not forced into Title Case", () => {
    const persona = elderlyUser;
    render(<PersonaCard persona={persona} />);
    const description = screen.getByText(persona.description);
    expect(description.className).not.toMatch(/capitalize/);
  });
});
