-- effective_plan: an expired access_grace_ends_at reads as grace_fallback_plan, else free;
-- with anchors, the highest tier whose own window is still open wins.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-0000000000e1','grace-lapsed@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e2','grace-fallback@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e3','grace-open@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e4','grace-lower-tier@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e5','grace-anchor-no-ends-at@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e6','grace-anchor-garbage-ends-at@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e7','grace-anchor-unknown-plan@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e8','grace-anchor-bad-skipped-good-kept@example.invalid');
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day' where id = '10000000-0000-4000-8000-0000000000e1';
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day', grace_fallback_plan = 'pro' where id = '10000000-0000-4000-8000-0000000000e2';
update public.profiles set plan = 'team', access_grace_ends_at = now() + interval '1 day' where id = '10000000-0000-4000-8000-0000000000e3';
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day',
  access_grace_anchors = jsonb_build_object(
    'sub_agency', jsonb_build_object('plan', 'team', 'ends_at', now() - interval '1 day'),
    'sub_solo', jsonb_build_object('plan', 'pro', 'ends_at', now() + interval '3 days'))
  where id = '10000000-0000-4000-8000-0000000000e4';
-- Malformed anchors are skipped like parseGraceAnchors does: with none valid the legacy rule
-- applies (here a future access_grace_ends_at keeps the stored plan); an invalid date never raises.
update public.profiles set plan = 'team', access_grace_ends_at = now() + interval '1 day',
  access_grace_anchors = '{"s":{"plan":"team"}}'::jsonb where id = '10000000-0000-4000-8000-0000000000e5';
update public.profiles set plan = 'team', access_grace_ends_at = now() + interval '1 day',
  access_grace_anchors = '{"s":{"plan":"team","ends_at":"not-a-date"},"t":{"plan":"pro","ends_at":12345}}'::jsonb
  where id = '10000000-0000-4000-8000-0000000000e6';
update public.profiles set plan = 'team', access_grace_ends_at = now() + interval '1 day',
  access_grace_anchors = jsonb_build_object('s', jsonb_build_object('plan', 'enterprise', 'ends_at', now() + interval '3 days'))
  where id = '10000000-0000-4000-8000-0000000000e7';
-- A bad anchor beside a valid open lower-tier one: the bad one is ignored, the good one counts.
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day',
  access_grace_anchors = jsonb_build_object(
    'bad', jsonb_build_object('plan', 'team', 'ends_at', 'garbage'),
    'good', jsonb_build_object('plan', 'pro', 'ends_at', now() + interval '3 days'))
  where id = '10000000-0000-4000-8000-0000000000e8';
do $$ begin
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e1') <> 'free' then raise exception 'lapsed grace must read free'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e2') <> 'pro' then raise exception 'lapsed grace must fall back to pro'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e3') <> 'team' then raise exception 'open grace keeps team'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e4') <> 'pro' then raise exception 'lower tier open grace must outlive the stronger tier'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e5') <> 'team' then raise exception 'anchor without ends_at must be skipped (legacy rule keeps team)'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e6') <> 'team' then raise exception 'garbage or non-string ends_at must be skipped without raising'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e7') <> 'team' then raise exception 'anchor with unknown plan must be skipped'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e8') <> 'pro' then raise exception 'invalid anchor must not hide a valid open one'; end if;
end $$;
rollback;
