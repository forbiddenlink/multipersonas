# Security policy

## Reporting a vulnerability

Report privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability** (private vulnerability reporting). Do not open a public issue
or pull request for a security problem.

Include the affected version or commit, steps to reproduce, and the impact you expect. You
get an acknowledgement as soon as a maintainer sees the report. Personaudit is solo-maintained,
so there is no response-time guarantee.

There is no bug bounty. Credit in the fix notes is available if you want it.

## Scope

In scope:

- **The SSRF guard** (`src/security/url-guard.ts`): any way to make the CLI, the hosted
  worker, or persona generation navigate to a loopback, private, link-local, or cloud
  metadata address, including via redirects, DNS rebinding, or IP-encoding tricks.
- **Session artifacts** (`personaudit auth` output): any way the saved session file is
  written with weak permissions, leaked into reports or logs, or used against a different origin.
- **The hosted worker** (`worker/`): job-queue abuse, escape from the egress-guard sidecar,
  cross-tenant data access, or secret exposure.

Out of scope:

- Findings that need `--allow-private` (it is a deliberate CLI-only opt-in; the hosted
  service never sets it).
- Accessibility defects on personaudit.com. Report those as ordinary issues.
- Denial of service through scanning very large sites you chose to scan.
- Vulnerabilities in third-party dependencies with no demonstrated impact on Personaudit.

Known limit: the CLI cannot fully close DNS rebinding in-process. The hosted worker closes it
with an egress proxy; see `docs/ssrf-egress-hardening.md`.
