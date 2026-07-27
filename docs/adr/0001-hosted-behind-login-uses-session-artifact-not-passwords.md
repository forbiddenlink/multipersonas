# ADR 0001 — Hosted behind-login scanning uses a session artifact, not passwords

Status: Proposed (2026-07-27)
Written against: main @ current session (branch fix/audit-p0-p1-honesty-a11y)

## Context

The validated wedge (agencies auditing many client sites) needs **hosted** behind-login
accessibility scanning — the deep, authenticated states are exactly where the billable
defects live, and asking every agency user to run the CLI kills the convenience the
hosted product is being paid for.

But the product's credibility line to date is "credentials never leave your machine,"
which is only true because behind-login scanning is CLI-only today. Hosting it means
authentication material touches our server, which appears to betray that promise and
re-opens the network-isolation/security blockers in docs/DEPLOYMENT.md.

## Decision

The hosted scan accepts a **session artifact** (a captured browser `storageState` /
cookie set the user generates locally — via the CLI `auth` command or a capture helper),
**never a raw password**. The server:

- uses the artifact only to drive the scan,
- encrypts it at rest,
- destroys it after the scan completes plus a short TTL,
- never logs it.

The fully-local **CLI mode** remains for production / high-sensitivity sites, where
nothing at all leaves the machine.

## Consequences

Positive:
- Enables the hosted agency wedge without ever holding a user's password.
- Honest new credibility line: "we never see or store your password; you hand us a
  short-lived session you generate, and we destroy it after the scan."
- Differentiates from rocket-vitals and free single-site scanners (they don't do
  authenticated state at all) — this is the moat.

Negative / honest risks:
- A session token **is** a bearer credential: if exfiltrated before TTL it grants account
  access. This is minimized, not eliminated. Must be stated plainly in UI + docs.
- Requires: encrypted-at-rest storage, guaranteed post-scan destruction, and the existing
  url-guard/egress-isolation work (DEPLOYMENT.md blockers still apply to the scanning host).
- Adds a capture step for the user (generate the session) — friction vs "just type a URL."

## Alternatives rejected

- **Take username/password server-side and log in for the user** — rejected: holds the
  strongest possible credential, worst breach blast radius, directly contradicts the
  credibility story. Non-starter.
- **Behind-login stays CLI-only forever** — rejected: cedes the hosted-convenience the
  agency wedge pays for; leaves the product as a public-only scanner (undifferentiated).

## Validation gate

Do NOT build the hosted session-artifact pipeline until the demand test (pre-sell to
agencies for authenticated multi-site scanning + reports) shows real pull. The CLI already
serves the paranoid/early users; hosted-auth infra is weeks of work resting on the one
demand signal the research could not confirm.
