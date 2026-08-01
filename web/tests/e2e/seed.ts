// Seed the LOCAL Supabase stack with a test user + owned data so the auth-gated
// app surfaces have something to render under E2E. Idempotent: re-running replaces
// the test user (cascades delete its rows) and re-inserts fresh data.
//
// Requires (from `supabase status -o env`, local only):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Run: pnpm exec tsx tests/e2e/seed.ts
import { createClient } from "@supabase/supabase-js";
import { TEST_USER } from "./constants";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "seed: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (from `supabase status -o env`).",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Idempotent reset: drop the existing test user (rows cascade) before reseeding.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === TEST_USER.email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
  });
  if (userErr || !created.user) throw userErr ?? new Error("seed: user not created");
  const userId = created.user.id;

  const { data: project, error: projErr } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      name: "Acme Marketing Site",
      url: "https://acme.example.com",
      description: "Seeded project for E2E coverage of the gated app.",
    })
    .select("id")
    .single();
  if (projErr || !project) throw projErr ?? new Error("seed: project not created");

  const now = new Date();
  const started = new Date(now.getTime() - 90_000);
  const { data: run, error: runErr } = await admin
    .from("test_runs")
    .insert({
      project_id: project.id,
      user_id: userId,
      url: "https://acme.example.com",
      status: "completed",
      task_success_achieved: 2,
      task_success_total: 3,
      persona_ids: ["first-time-visitor", "power-user-developer", "elderly-user"],
      started_at: started.toISOString(),
      completed_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (runErr || !run) throw runErr ?? new Error("seed: test_run not created");

  const { error: findErr } = await admin.from("findings").insert([
    {
      test_run_id: run.id,
      persona_id: "first-time-visitor",
      severity: "serious",
      category: "accessibility",
      title: "Form input has no associated label",
      description: "The newsletter email input is not programmatically labeled.",
      recommendation: "Add a <label for> or aria-label to the input.",
      page_url: "https://acme.example.com/",
      source: "axe",
    },
    {
      test_run_id: run.id,
      persona_id: "elderly-user",
      severity: "moderate",
      category: "usability",
      title: "Primary CTA is hard to find",
      description: "The elderly-user persona scrolled past the hero without noticing the CTA.",
      recommendation: "Increase CTA contrast and size; move above the fold.",
      page_url: "https://acme.example.com/pricing",
      source: "persona",
    },
  ]);
  if (findErr) throw findErr;

  const { error: journeyErr } = await admin.from("journey_steps").insert([
    {
      test_run_id: run.id,
      persona_id: "first-time-visitor",
      step: 0,
      action: "navigate",
      detail: "https://acme.example.com/",
      reasoning: "Landing here to see what this product does.",
      goal_completed: true,
      page_url: "https://acme.example.com/",
    },
    {
      test_run_id: run.id,
      persona_id: "first-time-visitor",
      step: 1,
      action: "click",
      detail: "Pricing",
      reasoning: "I want to know what it costs before signing up.",
      goal_completed: true,
      page_url: "https://acme.example.com/pricing",
    },
  ]);
  if (journeyErr) throw journeyErr;

  console.log(
    `seeded: user=${userId} project=${project.id} run=${run.id} (2 findings, 2 journey steps)`,
  );
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
