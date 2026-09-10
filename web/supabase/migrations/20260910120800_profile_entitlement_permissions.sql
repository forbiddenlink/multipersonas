-- Row ownership does not protect billing columns: an authenticated caller could
-- update their own plan through PostgREST and bypass the paid persona gate.
revoke update on public.profiles from public, anon, authenticated;
revoke update (id, email, plan, stripe_customer_id, created_at, updated_at)
  on public.profiles from public, anon, authenticated;
grant update (full_name, avatar_url, agency_name) on public.profiles to authenticated;
grant update on public.profiles to service_role;
