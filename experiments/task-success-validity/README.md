# Experiment: is the persona task-success verdict trustworthy?

**Status: PRE-REGISTERED 2026-07-16. No data collected. The goals, their ground-truth
labels, the metric, and the kill criteria below are committed before the harness exists,
so none can be chosen to fit a result.**

Written against: `4fcbbc5` (main).

## Why this decides the persona layer

Run 4 killed the accessibility differentiator: personas do not find defects a scripted
crawler misses. The one distinct thing personas still do is answer a question no crawler
can — *did a real-shaped user actually complete the flow?* — reported as task success
("achieved" / "blocked").

That output is only worth anything if the verdict is **correct**. A usability tool that
says "your checkout works" when it does not is worse than no tool: it manufactures false
confidence. So before the persona layer is pitched or priced on task success, the verdict
has to be validated against known ground truth.

## Method

Give a single-goal persona a task whose outcome is known in advance, and compare the
persona's verdict to the truth. On the Metabase fixture, signed in as the **non-admin**
user (`docs/TESTING.md`), some goals are genuinely reachable and some are genuinely not.

### The labeled goals (committed now, in `goals.ts`)

**ACHIEVABLE** — a non-admin user can do these; correct verdict is `achieved`:
1. Open the sample database and view the Orders table.
2. Open and view an existing dashboard.
3. View your own account profile.
4. Browse the list of connected databases.
5. Open a saved collection and view what is in it.

**IMPOSSIBLE** — a non-admin cannot do these, or they do not exist; correct verdict is
`blocked`:
6. Change the sample database's connection settings. *(admin only → /unauthorized)*
7. Add a new user account to the system. *(admin only)*
8. Find and view the product's pricing plans. *(self-hosted Metabase has no in-app pricing)*
9. Open the Admin settings panel. *(non-admin blocked)*
10. Delete another user from the system. *(admin only)*

The labels are backed by observed behaviour: earlier runs showed the non-admin session
hitting `/unauthorized` on admin routes and correctly reporting no in-app pricing.

## Metrics, declared now

For each goal: `label ∈ {achievable, impossible}`, `verdict ∈ {achieved, blocked}`.

```
correct        = (label=achievable ∧ verdict=achieved) ∨ (label=impossible ∧ verdict=blocked)
agreement      = correct / 10
falseAchieved  = |label=impossible ∧ verdict=achieved| / 5     ← the trust-killer
falseBlocked   = |label=achievable ∧ verdict=blocked|  / 5     ← annoying, not dangerous
```

The two error types are **not symmetric**, and the pre-registration treats them that way.
`falseAchieved` — claiming success on something that is actually impossible — is the
hallucinated-confidence failure that makes the tool actively harmful. `falseBlocked` —
giving up on something that was doable — is merely a false alarm.

## Kill criteria, declared now

**PRIMARY — `falseAchieved`:**

| falseAchieved | verdict |
|---|---|
| **> 20%** (≥ 2 of 5 impossible goals reported as achieved) | **KILL the task-success claim.** The verdict hallucinates success and cannot be sold as "did the user succeed." |
| ≤ 20% | trust survives the primary gate; read the secondary metric |

**SECONDARY — `agreement`:**

| agreement | reading |
|---|---|
| > 80% | trustworthy |
| 60–80% | weak — usable only with the error profile disclosed |
| < 60% | the verdict is noise |

## Declared in advance, so they cannot become excuses

- **Each goal is run once.** The persona arm is an LLM and non-deterministic, so a single
  run is a point estimate. A productionizable result would run each goal 3x; if any goal
  is rerun here, every run is recorded, and rerunning until the number improves is
  p-hacking.
- **A wandered/crashed run counts as-is.** If the persona never reaches a verdict, that is
  recorded, not silently retried.
- **n = 1 target.** A kill here is damning: if the verdict cannot be trusted on a clean,
  well-known app, it will not be trusted elsewhere. A pass means "validate on more
  targets", not "ship the pitch".
- **The honest outcome may be that this layer does not ship.** That is the point of testing
  it before pricing it.

## Result

_To be filled in after the run. Nothing above may change once data exists._
