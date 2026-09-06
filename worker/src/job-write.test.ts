import { expect, it } from "vitest";
import { writeJobState } from "./job-write.js";

it("rejects failed queue persistence rather than acknowledging the transition", async () => {
  await expect(writeJobState(Promise.resolve({ error: { message: "database unavailable" } })))
    .rejects.toThrow("database unavailable");
});
