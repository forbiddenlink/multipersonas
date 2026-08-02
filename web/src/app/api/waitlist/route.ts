import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/client-ip";

// Demand-test capture for the /for-agencies landing page. Insert-only — see
// supabase/migrations/008_waitlist.sql for the RLS policy (no select/update/delete,
// so this route can never read a row back, only add one).

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  sitesCount: z.enum(["1", "2-5", "6-20", "20+"]).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  // Public insert endpoint: rate-limit per IP so a script can't flood the waitlist.
  // (Distinct-email spam still needs a CAPTCHA/Turnstile — tracked as a follow-up.)
  const rate = await consumeRateLimit(`waitlist:${getClientIP(request)}`, "waitlist");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many signups from this network. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

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

  const { email, sitesCount, note } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email,
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
