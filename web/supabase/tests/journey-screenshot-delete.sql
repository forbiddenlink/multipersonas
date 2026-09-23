-- Synthetic fixtures only. Owners may delete their own journey screenshots.
begin;
insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-0000000000a1', 'replay-a@example.invalid'),
  ('10000000-0000-4000-8000-0000000000a2', 'replay-b@example.invalid');
insert into public.projects(id, user_id, name, url) values
  ('20000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-0000000000a1', 'Replay A', 'https://example.invalid'),
  ('20000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a2', 'Replay B', 'https://example.invalid');
insert into public.test_runs(id, project_id, user_id, url) values
  ('30000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-0000000000a1', 'https://example.invalid'),
  ('30000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a2', 'https://example.invalid');
insert into storage.buckets(id, name, public)
values ('replay-delete-other', 'replay-delete-other', false)
on conflict (id) do nothing;
insert into storage.objects(bucket_id, name) values
  ('journeys', '30000000-0000-4000-8000-0000000000a1/keyboard-traversal/step-000.png'),
  ('journeys', '30000000-0000-4000-8000-0000000000a2/keyboard-traversal/step-000.png'),
  ('journeys', 'not-a-run/keyboard-traversal/step-000.png'),
  ('replay-delete-other', '30000000-0000-4000-8000-0000000000a1/keyboard-traversal/step-000.png');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-0000000000a1';
do $$ declare affected int; begin
  delete from storage.objects
  where name = '30000000-0000-4000-8000-0000000000a2/keyboard-traversal/step-000.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner A deleted owner B replay screenshot'; end if;

  delete from storage.objects
  where bucket_id = 'journeys' and name = 'not-a-run/keyboard-traversal/step-000.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner deleted a screenshot outside their runs'; end if;

  delete from storage.objects
  where bucket_id = 'replay-delete-other';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner deleted a screenshot from another bucket'; end if;

  delete from storage.objects
  where bucket_id = 'journeys'
    and name = '30000000-0000-4000-8000-0000000000a1/keyboard-traversal/step-000.png';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not delete their own replay screenshot'; end if;
end $$;
rollback;
