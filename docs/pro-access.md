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

The signed webhook handles `checkout.session.completed` and
`checkout.session.async_payment_succeeded` for founding subscription checkouts whose
payment status is `paid` or `no_payment_required`. An unpaid checkout does not grant Pro.
Subscription updates/deletions retain the existing policy: `active` grants Pro; other
statuses set Free. The gate (`planAllowsPersonas`) does not change.

A profile update must return its saved row before the handler acknowledges success.
Database errors, missing profiles, or unavailable admin configuration return HTTP 500
so Stripe can retry. Repeated assignments are safe, but event ordering and overlapping
subscriptions are **not** reconciled yet; do not treat these tests as full billing proof.
See [the continuation review](plans/2026-09-18-continuation-review.md) for release gates.
