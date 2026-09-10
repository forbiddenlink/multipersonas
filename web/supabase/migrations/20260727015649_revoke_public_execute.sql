-- 007: fully close the "SECURITY DEFINER executable by anon/authenticated" advisories.
--
-- Functions grant EXECUTE to PUBLIC by default, and anon/authenticated inherit PUBLIC —
-- so revoking from those roles alone (migrations 004/006) left the grant in place. Revoke
-- from PUBLIC instead, then grant back only to service_role for the three the app/worker
-- actually call via the service client. handle_new_user is a trigger (never called over
-- the API), so it needs no grant back.

revoke all on function public.handle_new_user() from public;
revoke all on function public.consume_rate_limit(text, int, int) from public;
revoke all on function public.reserve_model_calls(int, int) from public;
revoke all on function public.claim_audit_job() from public;

grant execute on function public.consume_rate_limit(text, int, int) to service_role;
grant execute on function public.reserve_model_calls(int, int) to service_role;
grant execute on function public.claim_audit_job() to service_role;
