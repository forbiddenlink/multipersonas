-- Local-only seed, run automatically after migrations on `supabase db reset` / `start`.
-- Hosted Supabase grants these table privileges to the API roles via default privileges
-- (that is why prod works); the local stack does not always apply them, which leaves the
-- API roles unable to read/write the app tables even when RLS would allow it. Re-granting
-- the standard set here restores prod parity for local + CI E2E. Never applied to prod.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
