-- 004: durable, shared rate limiting + a global spend cap.
--
-- Replaces the in-process Map limiter in the audit route (per-instance, lost on recycle,
-- keyed off a client-settable X-Forwarded-For — see docs/DEPLOYMENT.md blocker #2/#3).
--
-- Both tables are service-role only: RLS is enabled with NO policies, which denies anon
-- and authenticated entirely. The audit route calls the RPCs below with a service-role
-- client. The RPCs are SECURITY DEFINER with an explicit search_path (also the fix for
-- the function_search_path advisory that flagged the pre-existing functions) and their
-- EXECUTE grant is revoked from anon/authenticated so a client cannot call them directly
-- with a forged, generous limit.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

create table if not exists public.usage_counters (
  day date primary key,
  model_calls int not null default 0,
  runs int not null default 0
);

alter table public.rate_limits enable row level security;
alter table public.usage_counters enable row level security;

-- Atomic fixed-window limiter. Returns true if the caller is within p_max for the window.
create or replace function public.consume_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits(key, window_start, count)
    values (p_key, v_now, 1)
  on conflict (key) do update set
    window_start = case
      when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then v_now else public.rate_limits.window_start end,
    count = case
      when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then 1 else public.rate_limits.count + 1 end
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- Atomically reserve p_calls against today's global budget. Returns false (reserving
-- nothing) if it would exceed p_cap — reserve-then-run, never check-then-act.
create or replace function public.reserve_model_calls(p_calls int, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_total int;
begin
  insert into public.usage_counters(day) values (v_day) on conflict (day) do nothing;
  update public.usage_counters
    set model_calls = model_calls + p_calls, runs = runs + 1
    where day = v_day and model_calls + p_calls <= p_cap
  returning model_calls into v_total;
  return v_total is not null;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from anon, authenticated;
revoke all on function public.reserve_model_calls(int, int) from anon, authenticated;
