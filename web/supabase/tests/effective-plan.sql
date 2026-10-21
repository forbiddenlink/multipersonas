-- effective_plan: an expired access_grace_ends_at reads as grace_fallback_plan, else free.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-0000000000e1','grace-lapsed@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e2','grace-fallback@example.invalid'),
 ('10000000-0000-4000-8000-0000000000e3','grace-open@example.invalid');
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day' where id = '10000000-0000-4000-8000-0000000000e1';
update public.profiles set plan = 'team', access_grace_ends_at = now() - interval '1 day', grace_fallback_plan = 'pro' where id = '10000000-0000-4000-8000-0000000000e2';
update public.profiles set plan = 'team', access_grace_ends_at = now() + interval '1 day' where id = '10000000-0000-4000-8000-0000000000e3';
do $$ begin
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e1') <> 'free' then raise exception 'lapsed grace must read free'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e2') <> 'pro' then raise exception 'lapsed grace must fall back to pro'; end if;
 if (select public.effective_plan(p) from public.profiles p where id = '10000000-0000-4000-8000-0000000000e3') <> 'team' then raise exception 'open grace keeps team'; end if;
end $$;
rollback;
