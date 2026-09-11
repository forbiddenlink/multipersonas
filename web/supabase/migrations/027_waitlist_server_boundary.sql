-- Direct PostgREST inserts bypass Turnstile and the durable per-IP rate limit.
-- Only the server endpoint may write after verifying those gates.
drop policy if exists "Anyone can join the waitlist" on public.waitlist;
revoke insert on public.waitlist from public, anon, authenticated;
grant insert on public.waitlist to service_role;
