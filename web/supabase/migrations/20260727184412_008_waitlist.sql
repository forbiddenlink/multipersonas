-- 008: demand-test waitlist for the /for-agencies landing page.
--
-- Insert-only capture: POST /api/waitlist writes a row via the anon client so we get a
-- real signal (an actual Supabase row) instead of a fake "thanks, we'll be in touch"
-- response with nothing behind it. There is deliberately NO select/update/delete policy —
-- RLS is enabled with only an insert policy below, so anon/authenticated can add a row but
-- can never read, edit, or delete one back out (deny by default; the service role can
-- still read for review). unique(email) both dedupes signups and gives the API route a
-- cheap "already on the list" branch on 23505.
--
-- Must be applied (via the Supabase dashboard/CLI, not this file) before /api/waitlist
-- works in prod — this migration is created but NOT applied as part of this change.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'for-agencies',
  sites_count text,          -- one of '1','2-5','6-20','20+' or null
  note text,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist" on public.waitlist
  for insert to anon, authenticated
  with check (true);
