import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeleteProjectForm } from "@/app/(app)/projects/delete-project-form";

afterEach(cleanup);

it("warns that confirmation deletes saved runs and replay screenshots", () => {
  render(<DeleteProjectForm action={async () => {}} projectName="Northwind" />);
  expect(screen.queryByText(/replay screenshots/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
  expect(screen.getByText(/Northwind/)).toHaveTextContent("saved runs and replay screenshots");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Delete project" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
});
