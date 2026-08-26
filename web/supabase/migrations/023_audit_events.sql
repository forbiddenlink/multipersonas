-- 023: service-side audit/event log for incident reconstruction.
--
-- This is operational telemetry, not product analytics. Clients can read their own
-- user-scoped events, but only the service role can write rows.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_events_created_at
  on public.audit_events(created_at desc);
create index if not exists idx_audit_events_actor
  on public.audit_events(actor_user_id, created_at desc);
create index if not exists idx_audit_events_resource
  on public.audit_events(resource_type, resource_id, created_at desc);

alter table public.audit_events enable row level security;

create policy "Users can view own audit events"
  on public.audit_events for select
  using ((select auth.uid()) = actor_user_id);

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
