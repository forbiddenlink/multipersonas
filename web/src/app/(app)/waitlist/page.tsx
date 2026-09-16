import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-access";
import { BoxDivider } from "@/components/forensic/divider";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { FOLLOW_UP_STATUSES, parseWaitlistSignals } from "@/lib/waitlist-note";
import { setWaitlistLeadStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Waitlist",
};

// Owner-only view of the /for-agencies demand signal. The waitlist table is deny-all to
// clients (no SELECT policy), so this reads via the service client — gated behind the
// ADMIN_EMAILS allowlist. Non-owners get a 404 (never reveal the route exists).
export default async function WaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) notFound();

  const admin = createAdminClient();
  if (!admin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>
        <p className="mt-3 text-muted-foreground">
          SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment, so signups can&apos;t
          be read here.
        </p>
      </div>
    );
  }

  const { data: rows, error } = await admin
    .from("waitlist")
    .select("email, source, sites_count, note, created_at, follow_up_status")
    .order("created_at", { ascending: false });

  const signups = rows ?? [];
  const bands: Record<string, number> = {};
  const authNeedBands: Record<string, number> = {};
  const scanPrefBands: Record<string, number> = {};
  const sourceBands: Record<string, number> = {};
  const campaignBands: Record<string, number> = {};
  const followUpBands: Record<string, number> = {};
  for (const r of signups) {
    const k = r.sites_count ?? "—";
    bands[k] = (bands[k] ?? 0) + 1;
    const signals = parseWaitlistSignals(r.note);
    sourceBands[r.source] = (sourceBands[r.source] ?? 0) + 1;
    followUpBands[r.follow_up_status] = (followUpBands[r.follow_up_status] ?? 0) + 1;
    if (signals.campaign) {
      campaignBands[signals.campaign] = (campaignBands[signals.campaign] ?? 0) + 1;
    }
    if (signals.authNeed) {
      authNeedBands[signals.authNeed] = (authNeedBands[signals.authNeed] ?? 0) + 1;
    }
    if (signals.scanPref) {
      scanPrefBands[signals.scanPref] = (scanPrefBands[signals.scanPref] ?? 0) + 1;
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>
        <p className="font-mono text-3xl tabular-nums text-foreground">{signups.length}</p>
      </div>
      <p className="mt-1 text-muted-foreground">
        Agency signups from{" "}
        <span className="font-mono text-sm">/for-agencies</span>. Owner-only.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Could not load signups: {error.message}
        </p>
      )}

      {signups.length === 0 ? (
        <EmptyPrompt
          className="mt-8"
          prompt="no signups yet"
          hint="Drive agency traffic to /for-agencies and they'll appear here."
        />
      ) : (
        <>
          <BoxDivider label="signups" className="mt-8 mb-4" />

          {Object.keys(bands).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(bands).map(([band, n]) => (
                <span
                  key={band}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  {band === "—" ? "no scale given" : `${band} sites`}:{" "}
                  <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}

          {Object.keys(authNeedBands).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(authNeedBands).map(([band, n]) => (
                <span
                  key={band}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  auth: {band}:{" "}
                  <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
              {Object.entries(scanPrefBands).map(([band, n]) => (
                <span
                  key={`pref-${band}`}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  prefer: {band}:{" "}
                  <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}

          {Object.keys(sourceBands).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(sourceBands).map(([source, n]) => (
                <span key={source} className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  source: {source}: <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}

          {Object.keys(campaignBands).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(campaignBands).map(([campaign, n]) => (
                <span
                  key={campaign}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  campaign: {campaign}: <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}

          {Object.keys(followUpBands).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(followUpBands).map(([status, n]) => (
                <span
                  key={status}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                >
                  {status}: <span className="font-medium text-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-card font-mono text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Scale</th>
                  <th className="px-4 py-2 font-medium">Follow-up</th>
                  <th className="px-4 py-2 font-medium">Note</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">When</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((r) => (
                  <tr key={r.email} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-4 py-2.5 font-mono font-medium text-foreground">{r.email}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {r.sites_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <form action={setWaitlistLeadStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="email" value={r.email} />
                        <select
                          name="status"
                          defaultValue={r.follow_up_status}
                          aria-label={`Follow-up status for ${r.email}`}
                          className="rounded-sm border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                        >
                          {FOLLOW_UP_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-sm px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="max-w-sm px-4 py-2.5 text-muted-foreground">{r.note || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
