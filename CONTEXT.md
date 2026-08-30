# Personaudit — Domain Glossary

Snapshot as of 2026-07-27. Glossary only — no implementation details.
Product identity: *audits your site like a real person.* Not a URL scanner (that is
rocket-vitals' job); an agent that **experiences** a site as different real-shaped people.

## Core terms

- **Persona** — a real-shaped user profile (e.g. first-time visitor, mobile-on-slow-3G,
  power user) that the agent embodies to browse the site. A persona is a **navigator**,
  not a compliance judge. It never renders an accessibility verdict. It is never a
  simulated disabled user (inaccurate + harmful — permanently out of scope).

- **Navigator role** — the persona's primary job: browse toward a goal the way that
  user would, reaching deep and authenticated states a single-URL scanner never sees.
  Reaching those states is the point; the verdict is rendered there by axe.

- **Verdict (accessibility)** — the deterministic axe-core result at each reached state.
  This is the only output that touches compliance. Not AI-generated. The billable,
  legally-defensible core.

- **Task success** — did this persona actually complete its goal? A per-persona
  achieved/blocked outcome the agent reports explicitly (never inferred from the agent
  stopping). A crawler cannot produce this at all. This is the persona layer's
  validated, distinct value.

- **The loop** — one pass: persona navigates → reaches a state → axe renders the verdict
  there + the persona's task-success is recorded. axe and personas are one loop, not two
  bolted-together products.

## Positioning boundaries (validated, do not cross)

- Personas do **not** find accessibility defects better than a plain crawler — measured,
  killed. So personas are never pitched as the a11y-finding engine.
- axe = compliance verdict. Personas = navigation + task-success (+ opinion, see below —
  UNRESOLVED). The two outputs are never blurred.
- "Credentials never leave your machine" — currently true only because behind-login
  scanning is CLI-only. Hosting it is an open architecture fork (see ADRs, TBD).

- **No surface may claim hosted behind-login until it ships.** Behind-login is CLI-only.
  Any page, paywall, or pitch implying the hosted product scans behind a login is false
  today — and it is worst on the paywall, where it oversells to someone about to pay.
  Known violation as of 2026-08-29: the Pro upsell. The one honest phrasing is: hosted
  task-success on public flows, behind-login via CLI, hosted behind-login is what
  founding purchases fund.

## Resolved 2026-07-27

- **Opinion** — a persona LLM's labeled usability hypothesis (copy, trust, confusion).
  IN as a **sandboxed third-class output**: never carries a severity, never enters the
  compliance report, always AI-disclosed. Distinct from a Verdict and from Task success.
  Kill-condition: opinion masquerading as a verdict.
- **Wedge** — agencies + freelancers shipping many client sites under ADA/EAA pressure.
  Priced at the underserved $50–300/mo SMB gap. Indie founders = secondary.
- **Billable job** — defensible accessibility evidence across authenticated states, for
  many client sites, in CI + as a handoff **Report**. Personas are why a buyer picks
  Personaudit; compliance coverage is what they pay for.
- **Report** — an exportable compliance-evidence artifact (VPAT-lite / PDF) built from
  Verdicts only. The thing an agency hands a client or lawyer.
- **Project** — one client site under audit: its scans, baseline, and history over time.
- **Session artifact** — a short-lived captured browser session (storageState) a user
  generates locally and hands us for a hosted behind-login scan. NOT a password. Encrypted
  at rest, destroyed after the scan. See ADR 0001.

## Two scan modes

- **Hosted** — user uploads a Session artifact; we scan, then destroy it. "We never see
  or store your password." Convenient; a session token is still a bearer credential
  (minimized, not zero-risk) — see ADR 0001.
- **CLI / local** — fully local, credentials never leave the machine. For prod / sensitive.

## Resolved 2026-08-29

- **Public launch** — RETIRED as a term. It conflated two unrelated things: deploy
  readiness (done — the product is already publicly reachable) and the Demand test
  (not run). Neither needs a "launch": the Demand test is a warm-list ask, not a
  traffic event. Say "Demand test" or name the specific infra item instead.

- **Demand test** — the gate in ADR 0001 that must pass before hosted behind-login
  scanning is built. It passes on **money actually charged**: agencies paying the
  founding-tier price before the hosted pipeline exists. A free waitlist email does
  **not** pass it — that measures interest, not willingness to pay, and a gate that
  cannot fail is not a gate. Threshold: of ~15 agencies asked, **2 or more paying = the
  wedge is real; zero = the wedge is wrong**, and the answer is the product, not the funnel.

- **Founding tier** — the single offer the Demand test sells: the agency workspace at
  one named price, paid before the hosted pipeline exists. Single-tier on purpose — the
  sample is too small to split across offers. "Founding" is what licenses the price to
  move later without breaking faith with early buyers.
  It is sold as a **pre-order**: the buyer gets every hosted capability that exists today
  and is told plainly that hosted behind-login does not yet exist, runs via CLI meanwhile,
  and is what their purchase funds. Sold any other way the Demand test measures the
  bundle rather than the one claim it exists to test.

- **Auth need** — how many of a respondent's client sites require scanning behind a login.
  Captured from buyers **and decliners**, because "we don't audit behind logins anyway"
  and "$199 is too much" are opposite results that a raw yes/no cannot tell apart.
