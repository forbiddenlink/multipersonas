-- 009: tighten the waitlist INSERT policy.
--
-- 008's policy used WITH CHECK (true), which the Supabase linter flags
-- (rls_policy_always_true) as effectively bypassing RLS for anon/authenticated.
-- Replace it with real column constraints so a direct anon insert (bypassing the
-- /api/waitlist zod validation) still cannot write junk: a plausible email, a bounded
-- source, a known sites_count value, and a length-capped note. Defense-in-depth beside
-- the API. There is still deliberately no SELECT/UPDATE/DELETE policy (deny by default;
-- only the service role can read for review).

drop policy if exists "Anyone can join the waitlist" on public.waitlist;

create policy "Anyone can join the waitlist" on public.waitlist
  for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and position('@' in email) > 1
    and char_length(source) between 1 and 64
    and (note is null or char_length(note) <= 500)
    and (sites_count is null or sites_count in ('1', '2-5', '6-20', '20+'))
  );
