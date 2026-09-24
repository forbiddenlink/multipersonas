import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { verifyTaskText } from "../../../src/tasks/verify";
import { TEST_USER } from "./constants";

// Local-only workflow trial. Browser actions are deterministic, not model-generated.
// The test supplies worker history writes; it does not establish model reliability.
test("save a task, record a keyboard barrier, fix it, and compare the retest", async ({ page, context }) => {
  test.setTimeout(90_000);
  const url = process.env.SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    throw new Error("Saved-task trial requires an isolated local Supabase stack");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Each device/retry gets its own caller allowance; never reset shared rate limits.
  const email = `saved-task-${randomUUID()}@personaudit.test`;
  const account = await admin.auth.admin.createUser({ email, password: TEST_USER.password, email_confirm: true });
  if (account.error || !account.data.user) throw new Error("Could not create the isolated synthetic user");
  const userId = account.data.user.id;
  const promoted = await admin.from("profiles").update({ plan: "pro" }).eq("id", userId);
  if (promoted.error) throw promoted.error;
  const created = await admin.from("projects").insert({
    user_id: userId, name: "Saved task synthetic trial", url: "https://example.com/",
  }).select("id").single();
  if (created.error) throw created.error;
  const projectId = created.data.id;
  const task = { version: 1 as const, goal: "Use the keyboard to reach the quote request page", successText: "Request your project quote" };
  const personaId = "keyboard-traversal";
  const target = await context.newPage();
  let fixed = false;
  await target.route("https://example.com/**", async (route) => {
    const quote = new URL(route.request().url()).pathname === "/quote";
    await route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en"><title>Synthetic quote site</title><body>${quote
      ? `<h1>${task.successText}</h1>`
      : `<h1>Project services</h1>${fixed ? '<a href="/quote">Request quote</a>' : '<div role="link" tabindex="0">Request quote</div>'}`}</body></html>` });
  });
  const uploads: string[] = [];
  const runIds: string[] = [];
  const jobIds: string[] = [];
  async function saveTask(): Promise<void> {
    // Wait for the server action's POST to arrive, but NOT for its body to finish.
    // A Next server action replies with a streamed RSC payload, and `.finished()`
    // on it does not resolve here -- it hangs until the test's own 90s budget runs
    // out, with the save itself already applied. Callers assert the resulting UI,
    // which is the real signal that the action completed.
    const response = page.waitForResponse((res) => res.request().method() === "POST" && new URL(res.url()).pathname === `/projects/${projectId}`);
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await response;
  }
  try {
    await context.clearCookies();
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await page.goto(`/projects/${projectId}`);
    await page.getByLabel("What should a visitor accomplish?").fill(task.goal);
    await page.getByLabel("Exact visible text expected on the final page").fill(task.successText);
    await saveTask();
    await expect(page.getByRole("button", { name: "Test saved task", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("What should a visitor accomplish?")).toHaveValue(task.goal);

    for (const shouldMatch of [false, true]) {
      fixed = shouldMatch;
      const queued = await page.request.post("/api/audit", { data: {
        url: "https://example.com/", projectId, personaIds: [personaId],
      } });
      expect(queued.status()).toBe(202);
      const { jobId } = await queued.json();
      jobIds.push(jobId);
      const job = await admin.from("audit_jobs").select("task_definition").eq("id", jobId).single();
      if (job.error) throw job.error;
      expect(job.data.task_definition).toEqual(task);

      await target.goto("https://example.com/");
      await target.keyboard.press("Tab");
      await target.keyboard.press("Enter");
      if (fixed) await expect(target.getByRole("heading", { name: task.successText })).toBeVisible();
      const evidence = await verifyTaskText(target, task, 0);
      expect(evidence.status).toBe(shouldMatch ? "observed" : "not-observed");
      const screenshot = await target.screenshot();
      const run = await admin.from("test_runs").insert({
        user_id: userId, project_id: projectId, url: "https://example.com/", status: "completed",
        persona_ids: [personaId], task_definition: job.data.task_definition,
        task_outcomes: [{ personaId, evidence }], task_success_achieved: shouldMatch ? 1 : 0,
        task_success_total: 1, started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      }).select("id").single();
      if (run.error) throw run.error;
      runIds.push(run.data.id);
      const screenshotPath = `${run.data.id}/${personaId}/task-verification.png`;
      const upload = await admin.storage.from("journeys").upload(screenshotPath, screenshot, { contentType: "image/png" });
      if (upload.error) throw upload.error;
      uploads.push(screenshotPath);
      const step = await admin.from("journey_steps").insert({
        test_run_id: run.data.id, persona_id: personaId, step: 1, action: "verify_task",
        detail: `${evidence.status}: expected visible text ${JSON.stringify(task.successText)}`,
        page_url: evidence.pageUrl, screenshot_path: screenshotPath, goal_completed: shouldMatch,
      });
      if (step.error) throw step.error;
      const completed = await admin.from("audit_jobs").update({ status: "completed" }).eq("id", jobId);
      if (completed.error) throw completed.error;
      await page.reload();
      await expect(page.getByRole("region", { name: "Saved task result" })).toContainText(
        shouldMatch ? "Expected text observed" : "Expected text not observed",
      );
    }
    await expect(page.getByText(/Expected text observed in 1 of 1 profiles; previously 0 of 1/)).toBeVisible();
    await page.getByRole("link", { name: "View evidence", exact: true }).click();
    await expect(page.getByText(/observed: expected visible text/).first()).toBeVisible();
    await expect(page.getByText("inferred frustration", { exact: false })).toHaveCount(0);
    await page.goto(`/audits/${runIds[1]}/report`);
    await expect(page.getByText(task.goal, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Task tested", exact: true })).toBeVisible();
    await expect(page.getByText(/Expected text observed/)).toBeVisible();

    await page.goto(`/projects/${projectId}`);
    await page.getByLabel("Expected final URL (optional)").fill("https://example.com/quote");
    await page.getByLabel("Require the expected text to be absent at the start and visible at the end").check();
    await saveTask();
    await page.reload();
    await expect(page.getByLabel("Expected final URL (optional)")).toHaveValue("https://example.com/quote");
    const contextual = await admin.from("projects").select("task_definition").eq("id", projectId).single();
    expect(contextual.data?.task_definition).toEqual({ ...task, version: 2, requireNewText: true, expectedUrl: "https://example.com/quote" });
    await page.getByLabel("Expected final URL (optional)").fill("https://other.example/quote");
    await saveTask();
    await expect(page.getByRole("alert").filter({ hasText: "same protocol, hostname, and port" })).toBeVisible();
    await expect(page.getByLabel("Expected final URL (optional)")).toHaveValue("https://example.com/quote");

    await page.getByLabel("Expected final URL (optional)").fill("");
    await page.getByLabel("Require the expected text to be absent at the start and visible at the end").uncheck();
    await page.getByLabel("What should a visitor accomplish?").fill("");
    await page.getByLabel("Exact visible text expected on the final page").fill("");
    await saveTask();
    await expect(page.getByRole("button", { name: "Run audit", exact: true })).toBeVisible();
    const oldRun = await admin.from("test_runs").select("task_definition").eq("id", runIds[0]).single();
    expect(oldRun.data?.task_definition).toEqual(task);
  } finally {
    await target.close();
    if (uploads.length) await admin.storage.from("journeys").remove(uploads);
    if (jobIds.length) {
      const reservations = await admin.from("audit_jobs").select("reserved_calls, caller_key").in("id", jobIds);
      if (reservations.error) throw reservations.error;
      // No worker runs in this fixture; refund only these unconsumed reservations.
      for (const job of reservations.data) {
        const refund = await admin.rpc("release_model_calls_scoped", { p_calls: job.reserved_calls, p_caller: job.caller_key });
        if (refund.error) throw refund.error;
      }
      await admin.from("audit_jobs").delete().in("id", jobIds);
    }
    if (runIds.length) await admin.from("test_runs").delete().in("id", runIds);
    await admin.from("projects").delete().eq("id", projectId);
    await admin.from("rate_limits").delete().eq("key", userId);
    await admin.from("usage_counters_by_caller").delete().eq("caller", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});
