/**
 * The workflow shown on /guides/ci-accessibility-gate. It must stay byte-identical to the
 * body of examples/github-actions/accessibility-gate.yml (from `name:` on): a hand-kept
 * copy drifted once and shipped YAML GitHub rejects. ci-gate-example.test.ts enforces it.
 */
export const CI_GATE_WORKFLOW = `name: Accessibility gate
on: pull_request

# pull-requests: write is only needed for the sticky comment (packaged action input
# \`comment: "true"\`). Drop it if you do not use that input.
permissions:
  contents: read
  pull-requests: write

jobs:
  a11y:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      TARGET_URL: \${{ vars.PERSONAUDIT_TARGET_URL }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
      - name: Install Personaudit and Chromium
        run: |
          npm install -g personaudit
          npx playwright install --with-deps chromium

      # Secrets cannot be tested in \`if:\`, so the step always runs and writes
      # an empty file when the secret is unset. Remove it for a public site.
      - name: Restore session
        env:
          SESSION_JSON: \${{ secrets.PERSONAUDIT_SESSION }}
        run: |
          if [ -n "$SESSION_JSON" ]; then
            printf '%s' "$SESSION_JSON" > session.json
            chmod 600 session.json
          fi

      - name: Scan and gate on new serious defects
        run: |
          args=( scan "$TARGET_URL" --baseline personaudit-baseline.json --fail-on serious )
          if [ -s session.json ]; then args+=( --session session.json ); fi
          personaudit "\${args[@]}"

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: accessibility-report
          path: personaudit-report/scan.md
`;
