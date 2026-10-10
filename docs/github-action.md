# Personaudit accessibility gate — GitHub Action

Fail a pull request only on **new** accessibility defects, measured with deterministic
axe-core. No API key, no external service — the gate is keyless (personas/AI are a separate
paid layer and are never invoked here).

## Usage

```yaml
# .github/workflows/a11y.yml
name: Accessibility gate
on: [pull_request]

permissions:
  contents: read

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      # Needed only so the committed baseline file is on disk.
      - uses: actions/checkout@v4
      - uses: forbiddenlink/multipersonas@v1
        with:
          url: https://staging.your-site.com
          fail-on: serious                 # critical | serious | moderate | minor
          baseline: personaudit-baseline.json
```

The step exits non-zero (failing the check) when there is any new defect at or above
`fail-on` that is not already in the baseline. Defects fixed since the baseline are reported
too.

## Creating the baseline

Run once locally to snapshot today's known issues, then commit the file so only
**regressions** fail the build:

```bash
npx personaudit scan https://staging.your-site.com --update-baseline --baseline personaudit-baseline.json
git add personaudit-baseline.json && git commit -m "chore: accessibility baseline"
```

## Scanning behind a login

Save a session locally (`npx personaudit auth <url> --save session.json`), commit it as an
**encrypted** secret or reconstruct it in CI, then pass `session:` to the action. Credentials
never leave the runner.

## Inputs

| Input       | Default             | Description                                                        |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| `url`       | — (required)        | URL to scan.                                                       |
| `fail-on`   | `serious`           | Minimum severity that fails the build.                             |
| `baseline`  | _(none)_            | Baseline JSON path; only defects not in it count as new.           |
| `suppressions` | _(none)_         | Suppressions JSON (reason, owner, expiry per defect key). See below. |
| `session`   | _(none)_            | Saved session file for authenticated scans.                        |
| `max-pages` | `20`                | Max pages to crawl.                                                |
| `report`    | `personaudit-report`| Output directory (add your own upload-artifact step to keep it).   |

## Suppressions with an expiry

To accept a known defect for a while, list its key (from `scan.json`) with a reason, an
owner and an expiry date:

```json
{ "suppressions": [
  { "key": "color-contrast|.promo > a", "reason": "Vendor widget, fix due in their Q3 release", "owner": "ana", "expires": "2026-12-31" }
] }
```

The defect does not count toward the gate until the expiry date. After that, the gate fails
while the defect is still present, naming the key, owner and date. A key that matches no
current defect is a warning, not a failure. Reports list suppressed and expired items
separately in `scan.md` and `scan.json`.

## Outputs

| Output        | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `new-defects` | New defects at or above `fail-on` (0 when the gate passed).                 |
| `report-path` | Path to the Markdown report (`<report>/scan.md`).                           |

Give the step an `id` to read them, for example `${{ steps.a11y.outputs.new-defects }}`.
The step still fails the job when the gate fails; use `if: always()` on later steps.

## Upload the report (optional)

```yaml
      - uses: forbiddenlink/multipersonas@v1
        with: { url: https://staging.your-site.com, baseline: personaudit-baseline.json }
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: accessibility-report
          path: personaudit-report
```
