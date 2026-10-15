-- Optional "email me this grade" capture for the free public grader.
--
-- Why a separate table: an email address is personal data and grader_scans is reached by
-- anyone holding a result link. The address lives here, never on the grade row.
--
-- Access: RLS is enabled with NO policy and every table privilege is revoked from anon and
-- authenticated, so only the service role (web routes) can touch it. The functions below are
-- SECURITY DEFINER with a pinned search_path and execute is granted to service_role only.
--
-- Lifecycle of the address:
--   captured -> (grade finishes) -> one email -> address set to NULL, sent_at stamped
-- The row stays as a tombstone so a second request for the same grade is refused (one email
-- per grade). A hard TTL deletes every row, tombstone or not, after 7 days; the request
-- function refuses grades older than 1 day, so a deleted tombstone cannot be re-used.
-- A row whose send failed three times has its address nulled without being sent.

create table if not exists public.grade_email_requests (
  token uuid primary key references public.grader_scans(token) on delete cascade,
  email text check (email is null or char_length(email) <= 254),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0
);

create index if not exists idx_grade_email_requests_created on public.grade_email_requests (created_at);

alter table public.grade_email_requests enable row level security;
revoke all on table public.grade_email_requests from public, anon, authenticated;

-- Hard TTL: nothing in this table outlives 7 days.
create or replace function public.prune_grade_email_requests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  with doomed as (
    select token from public.grade_email_requests
    where created_at < now() - interval '7 days'
    order by created_at
    limit 200
    for update skip locked
  ), gone as (
    delete from public.grade_email_requests r using doomed d where r.token = d.token returning 1
  )
  select count(*) into v_deleted from gone;
  return v_deleted;
end;
$$;

-- Capture. Returns one of: saved, exists, not_found, expired, rate_limited.
-- The caps (per caller IP and per recipient, both per window) are checked here, in the same
-- transaction as the insert, so a burst of parallel requests cannot overshoot them. The
-- recipient key is a hash supplied by the caller; the rate_limits table never sees the address.
create or replace function public.request_grade_email(
  p_token uuid,
  p_email text,
  p_ip_key text,
  p_ip_max int,
  p_to_key text,
  p_to_max int,
  p_window_seconds int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created timestamptz;
  v_rows int;
begin
  if p_email is null or char_length(p_email) > 254 or position('@' in p_email) < 2 then
    raise exception 'invalid email';
  end if;

  perform public.prune_grade_email_requests();

  select created_at into v_created from public.grader_scans where token = p_token;
  if not found then
    return 'not_found';
  end if;
  if v_created < now() - interval '1 day' then
    return 'expired';
  end if;
  if exists (select 1 from public.grade_email_requests where token = p_token) then
    return 'exists';
  end if;

  if not public.consume_rate_limit(p_ip_key, p_ip_max, p_window_seconds) then
    return 'rate_limited';
  end if;
  if not public.consume_rate_limit(p_to_key, p_to_max, p_window_seconds) then
    return 'rate_limited';
  end if;

  insert into public.grade_email_requests (token, email)
    values (p_token, p_email)
    on conflict (token) do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then 'saved' else 'exists' end;
end;
$$;

-- Claim the address for one send attempt. Returns the address, or NULL when there is nothing
-- to send: no request, already sent, grade not finished, another attempt in flight (10 minute
-- lease), or three attempts used (in which case the address is nulled).
create or replace function public.claim_grade_email(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  update public.grade_email_requests
    set email = null
    where token = p_token and email is not null and sent_at is null and attempts >= 3;

  update public.grade_email_requests r
    set claimed_at = now(), attempts = r.attempts + 1
    where r.token = p_token
      and r.email is not null
      and r.sent_at is null
      and r.attempts < 3
      and (r.claimed_at is null or r.claimed_at < now() - interval '10 minutes')
      and exists (
        select 1 from public.grader_scans s
        where s.token = r.token and s.status in ('completed', 'failed')
      )
    returning r.email into v_email;
  return v_email;
end;
$$;

-- Record the outcome of a claimed attempt. On success the address is erased.
create or replace function public.finish_grade_email(p_token uuid, p_sent boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sent then
    update public.grade_email_requests
      set email = null, sent_at = now(), claimed_at = null
      where token = p_token;
  else
    update public.grade_email_requests
      set claimed_at = null
      where token = p_token;
  end if;
end;
$$;

-- Backstop sweep: finished grades whose request was never sent (worker call missed, or the
-- reaper dead-lettered the job without the worker). Oldest first.
create or replace function public.pending_grade_email_tokens(p_limit int default 25)
returns table(token uuid)
language sql
security definer
set search_path = public
as $$
  select r.token
  from public.grade_email_requests r
  join public.grader_scans s on s.token = r.token
  where r.email is not null
    and r.sent_at is null
    and s.status in ('completed', 'failed')
    and (r.claimed_at is null or r.claimed_at < now() - interval '10 minutes')
  order by r.created_at
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.prune_grade_email_requests() from public, anon, authenticated;
revoke all on function public.request_grade_email(uuid, text, text, int, text, int, int) from public, anon, authenticated;
revoke all on function public.claim_grade_email(uuid) from public, anon, authenticated;
revoke all on function public.finish_grade_email(uuid, boolean) from public, anon, authenticated;
revoke all on function public.pending_grade_email_tokens(int) from public, anon, authenticated;
grant execute on function public.prune_grade_email_requests() to service_role;
grant execute on function public.request_grade_email(uuid, text, text, int, text, int, int) to service_role;
grant execute on function public.claim_grade_email(uuid) to service_role;
grant execute on function public.finish_grade_email(uuid, boolean) to service_role;
grant execute on function public.pending_grade_email_tokens(int) to service_role;
