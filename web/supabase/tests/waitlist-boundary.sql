begin;
set local role anon;
do $$ begin
  begin
    insert into public.waitlist(email) values ('direct-spam@example.invalid');
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Direct anonymous writes must not bypass the rate-limit and bot gate';
end $$;
rollback;
