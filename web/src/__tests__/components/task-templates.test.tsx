import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TaskTemplates, TASK_TEMPLATES } from "@/components/task-templates";
import { taskDefinitionSchema } from "@engine/tasks/definition";

afterEach(cleanup);

function Form() {
  return (
    <form>
      <TaskTemplates />
      <textarea id="task-goal" defaultValue="" aria-label="Goal" />
      <input id="task-success-text" defaultValue="old text" aria-label="Expected text" />
    </form>
  );
}

describe("TaskTemplates", () => {
  it("fills the goal, clears the expected text, and focuses it with an example", () => {
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Find pricing" }));
    expect(screen.getByLabelText("Goal")).toHaveValue(TASK_TEMPLATES[0]!.goal);
    const text = screen.getByLabelText("Expected text");
    expect(text).toHaveValue("");
    expect(text).toHaveFocus();
    expect(text).toHaveAttribute("placeholder", expect.stringContaining("pricing page"));
  });

  it("only offers goals the saved-task schema accepts", () => {
    for (const t of TASK_TEMPLATES) {
      expect(taskDefinitionSchema.safeParse({ version: 1, goal: t.goal, successText: "Placeholder" }).success).toBe(true);
    }
  });
});
