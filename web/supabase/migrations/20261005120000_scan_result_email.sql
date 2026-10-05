-- Scheduled scans ran silently: the result only showed up if the owner happened to
-- open the project. These two columns let /api/schedules/notify email each finished
-- scheduled scan exactly once.
--
-- notify_email: owner opt-out, on by default for every schedule (existing ones too).
-- last_notified_job_id: the job whose result was last emailed. The notifier claims a
-- job by moving this column forward with a conditional update before it sends, so
-- overlapping cron calls cannot email the same result twice.
alter table public.project_scan_schedules
  add column notify_email boolean not null default true,
  add column last_notified_job_id uuid references public.audit_jobs(id) on delete set null;
