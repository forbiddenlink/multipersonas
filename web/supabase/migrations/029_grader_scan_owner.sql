-- Attach anonymous public grades to the account that later claims their share tokens.
-- Reads stay on the service-role capability-token path; this column is write-once
-- (null -> owner) so a second account cannot steal a grade.
alter table public.grader_scans
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_grader_scans_user
  on public.grader_scans (user_id)
  where user_id is not null;
