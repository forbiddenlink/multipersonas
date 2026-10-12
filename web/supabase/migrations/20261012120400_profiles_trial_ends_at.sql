-- ABU-002: record when a subscriber's Stripe trial ends.
--
-- About 20 trial accounts (a card hold and an email each) could use their full 250-call
-- daily sub-cap and exhaust the 5000-call global budget, locking out every other paid
-- user until UTC midnight. To cap trialing accounts lower, the spend path needs to know
-- which callers are in a trial. Nothing stored that: profiles.plan is the same for a
-- trialing and a paying subscriber.
--
-- The Stripe webhook (service role) now writes trial_ends_at when the strongest entitled
-- subscription is still `trialing`, and clears it when a subscription becomes active or
-- lapses. web/src/lib/spend.ts treats a caller as trialing while trial_ends_at is in the
-- future, so a delayed webhook cannot extend a trial past its end.
--
-- Users cannot write it: 025 already revoked table-level UPDATE on profiles and granted
-- only full_name, avatar_url and agency_name, so a new column is service-role-only by
-- default. Additive and replayable; existing rows stay null (not trialing).

alter table public.profiles add column if not exists trial_ends_at timestamptz;
