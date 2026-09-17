# Founding access and Pro entitlements

Persona task-success runs are gated behind `profiles.plan in ('pro','team')`
(`web/src/lib/entitlements.ts`, enforced in `web/src/app/api/audit/route.ts`). Founding
access uses Stripe Checkout when its production configuration is present. Manual grants
remain available for early-access support.

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

## Upgrade routing

The free dashboard and a completed grade point to `/for-agencies#early-access`: that
surface either opens Stripe Checkout or shows the public founding-access waitlist. The
user is never sent to the owner-only `/waitlist` inbox.

## Stripe lifecycle

A Stripe webhook will flip `profiles.plan` on subscription create/cancel. The gate
(`planAllowsPersonas`) does not change — only the source of the plan value does.
