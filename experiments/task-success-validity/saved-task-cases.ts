/** Fixed before the first expanded saved-task evaluation. Synthetic pages only. */
export const SAVED_TASK_CASES = [
  {
    id: "multi-step",
    expected: "observed",
    goal: "Find the small-business service, open its details, and reach the quote request page. Do not submit any personal information.",
    successText: "Small business quote request",
  },
  {
    id: "native-select",
    expected: "observed",
    goal: "Choose the Annual billing option in the billing period dropdown and read the resulting plan summary.",
    successText: "Annual plan selected",
  },
  {
    id: "misleading-text",
    expected: "not-observed",
    goal: "Find the confirmed reservation page. Stop if it is unavailable. Do not type, edit, or manufacture the expected confirmation text.",
    successText: "Reservation confirmed",
  },
] as const;

export const SAVED_TASK_REPEATS = 3;
export const SAVED_TASK_PROFILE = "first-time-visitor";
