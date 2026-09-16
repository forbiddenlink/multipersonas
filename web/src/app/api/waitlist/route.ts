import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/client-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { isAttributionValue } from "@/lib/waitlist-note";

// Demand-test capture for the /for-agencies landing page. Writes go through this
// checked endpoint; direct client inserts cannot bypass its bot and rate gates.

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  sitesCount: z.enum(["1", "2-5", "6-20", "20+"]).optional(),
  note: z.string().max(500).optional(),
  attribution: z
    .object({
      source: z.string().refine(isAttributionValue).optional(),
      campaign: z.string().refine(isAttributionValue).optional(),
      referrerHost: z.string().refine(isAttributionValue).optional(),
    })
    .optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  // Validate before consuming a rate-limit slot so typos / bad JSON don't burn
  // the per-IP waitlist quota. (Distinct-email spam still needs CAPTCHA/Turnstile.)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const ip = getClientIP(request);
  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "Verification failed. Please refresh the page and try again." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Waitlist is not configured." }, { status: 503 });
  }

  const rate = await consumeRateLimit(`waitlist:${ip}`, "waitlist");
  if (rate.unavailable) {
    return NextResponse.json(
      { error: "This service is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many signups from this network. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const { email, sitesCount, note, attribution } = parsed.data;

  const { error } = await supabase.from("waitlist").insert({
    email,
    source: `for-agencies:${attribution?.source ?? "direct"}`,
    sites_count: sitesCount ?? null,
    note: note ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    console.error("waitlist insert failed:", error);
    return NextResponse.json(
      { error: "Could not join the waitlist. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
