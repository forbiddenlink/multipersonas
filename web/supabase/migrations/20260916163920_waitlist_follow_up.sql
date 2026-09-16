-- Owner-only lead workflow for the agency demand test.
--
-- The public endpoint can only insert qualified interest. Follow-up status is written
-- later by an authenticated owner through the server action; it is never client-writable.

alter table public.waitlist
  add column if not exists follow_up_status text not null default 'new';

alter table public.waitlist
  add constraint waitlist_follow_up_status_check
  check (follow_up_status in ('new', 'contacted', 'qualified', 'not_now', 'converted'));
