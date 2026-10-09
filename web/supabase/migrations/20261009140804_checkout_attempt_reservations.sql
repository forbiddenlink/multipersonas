-- One durable attempt per account, shared by every paid tier and every server instance.
-- Retain ambiguous Stripe failures so retries keep the same immutable parameters/key.
create table public.checkout_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  id uuid not null unique,
  plan text not null check (plan in ('founding', 'solo')),
  params jsonb not null check (jsonb_typeof(params) = 'object'),
  session_id text,
  created_at timestamptz not null default now()
);
alter table public.checkout_attempts enable row level security;
-- Billing state is server-only, including reads: params can contain buyer information.
revoke all on public.checkout_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.checkout_attempts to service_role;
