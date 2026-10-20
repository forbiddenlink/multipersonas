-- Expiring grace window for past_due subscriptions.
--
-- Stripe can leave a subscription `past_due` after its retries finish, and no event fires
-- when that window runs out. Keeping paid access on `past_due` therefore needs an end date
-- the app can check at read time. The Stripe webhook (service role) writes
-- access_grace_ends_at only while the strongest paid grant rests on a past_due subscription
-- (first failed renewal + 7 days, see PAST_DUE_GRACE_DAYS in web/src/lib/plans.ts) and
-- clears it when a subscription is active, trialing or gone. Plan reads
-- (web/src/lib/entitlements.ts) treat a paid plan as free once this instant has passed.
--
-- Users cannot write it: 025 already revoked table-level UPDATE on profiles and granted only
-- full_name, avatar_url and agency_name, so a new column is service-role-only by default.
-- Additive and replayable; existing rows stay null (no grace limit).

alter table public.profiles add column if not exists access_grace_ends_at timestamptz;
