-- Per-caller daily spend sub-cap, beneath the global daily cap.
--
-- The global cap (reserve_model_calls / usage_counters) bounds total spend, but it is a
-- single shared counter: one caller could reserve the whole day's budget and deny audits
-- to everyone until UTC midnight (an availability DoS). This adds a per-caller ceiling so
-- no single caller can consume more than its share.
--
-- Design: a new scoped reserve function reserves against BOTH counters atomically in one
-- transaction. If the per-caller cap is hit it undoes the global reservation it just made,
-- so a rejected run reserves nothing. Refunds (release_model_calls, the reaper) stay
-- GLOBAL-only and are unchanged; the per-caller counter is intentionally NOT refunded on a
-- failed run (it is a fairness ceiling, not a spend ledger, and it self-heals at UTC
-- midnight). This keeps the worker/reaper untouched. The old reserve_model_calls(int,int)
-- stays so a mid-deploy old client keeps working.

create table if not exists public.usage_counters_by_caller (
  day date not null,
  caller text not null,
  model_calls int not null default 0,
  primary key (day, caller)
);

-- Service-role only: RLS on, no policies -> anon + authenticated denied entirely.
alter table public.usage_counters_by_caller enable row level security;

create or replace function public.reserve_model_calls_scoped(
  p_calls int,
  p_cap int,
  p_caller text,
  p_caller_cap int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_global int;
  v_caller int;
begin
  -- 1) Reserve against the global daily cap (same logic as reserve_model_calls).
  insert into public.usage_counters(day) values (v_day) on conflict (day) do nothing;
  update public.usage_counters
    set model_calls = model_calls + p_calls, runs = runs + 1
    where day = v_day and model_calls + p_calls <= p_cap
  returning model_calls into v_global;
  if v_global is null then
    return false; -- global full: nothing reserved
  end if;

  -- 2) Reserve against this caller's daily sub-cap.
  insert into public.usage_counters_by_caller(day, caller)
    values (v_day, p_caller) on conflict (day, caller) do nothing;
  update public.usage_counters_by_caller
    set model_calls = model_calls + p_calls
    where day = v_day and caller = p_caller and model_calls + p_calls <= p_caller_cap
  returning model_calls into v_caller;
  if v_caller is null then
    -- Caller sub-cap hit: undo the global reservation from step 1 (same transaction),
    -- so this rejected run reserves nothing anywhere.
    update public.usage_counters
      set model_calls = greatest(0, model_calls - p_calls),
          runs = greatest(0, runs - 1)
      where day = v_day;
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.reserve_model_calls_scoped(int, int, text, int)
  from anon, authenticated;
