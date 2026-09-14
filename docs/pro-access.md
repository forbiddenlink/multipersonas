# Granting Pro access (early access, no Stripe yet)

Persona task-success runs are gated behind `profiles.plan in ('pro','team')`
(`web/src/lib/entitlements.ts`, enforced in `web/src/app/api/audit/route.ts`). During early
access there is no self-serve checkout; grant access manually.

## Grant a user Pro

Find the user's id by email:

```sql
select id, email from auth.users where email = 'person@example.com';
```

Set their plan:

```sql
update public.profiles set plan = 'pro' where id = '<user-uuid>';
```

`team` behaves the same as `pro` for the persona gate today.

## What free vs Pro get

- Free / anonymous: the deterministic axe-core surface (the public `/grade` page and the
  keyless CLI). A hosted persona audit returns `402` with an upgrade prompt.
- Pro / team: the hosted persona task-success audit (personas + replay + projects).

## Contact routing

The "Request Pro access" link (audit-form paywall + settings) uses
`NEXT_PUBLIC_SUPPORT_EMAIL` when set (a `mailto:`), otherwise it falls back to
`/for-agencies`. `/waitlist` is the owner-only inbox and 404s for everyone else.

## When Stripe lands

A Stripe webhook will flip `profiles.plan` on subscription create/cancel. The gate
(`planAllowsPersonas`) does not change — only the source of the plan value does.
