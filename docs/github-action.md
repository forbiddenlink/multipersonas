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
          baseline: .mpersonas-baseline.json
```

The step exits non-zero (failing the check) when there is any new defect at or above
`fail-on` that is not already in the baseline. Defects fixed since the baseline are reported
too.

## Creating the baseline

Run once locally to snapshot today's known issues, then commit the file so only
**regressions** fail the build:

```bash
npx mpersonas scan https://staging.your-site.com --update-baseline --baseline .mpersonas-baseline.json
git add .mpersonas-baseline.json && git commit -m "chore: accessibility baseline"
```

## Scanning behind a login

Save a session locally (`mpersonas auth <url> --save session.json`), commit it as an
**encrypted** secret or reconstruct it in CI, then pass `session:` to the action. Credentials
never leave the runner.

## Inputs

| Input       | Default             | Description                                                        |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| `url`       | — (required)        | URL to scan.                                                       |
| `fail-on`   | `serious`           | Minimum severity that fails the build.                             |
| `baseline`  | _(none)_            | Baseline JSON path; only defects not in it count as new.           |
| `session`   | _(none)_            | Saved session file for authenticated scans.                        |
| `max-pages` | `20`                | Max pages to crawl.                                                |
| `report`    | `mpersonas-report`  | Output directory (add your own upload-artifact step to keep it).   |

## Upload the report (optional)

```yaml
      - uses: forbiddenlink/multipersonas@v1
        with: { url: https://staging.your-site.com, baseline: .mpersonas-baseline.json }
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: accessibility-report
          path: mpersonas-report
```
