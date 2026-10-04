## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checks

- [ ] `pnpm lint && pnpm exec tsc --noEmit && pnpm typecheck:test && pnpm test`
- [ ] If `web/` changed: `cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build`

## Honesty checklist

- [ ] No compliance claims (nothing says "compliant", "certified", or "WCAG conformant")
- [ ] No disability simulation (no persona role-plays a disabled user)
- [ ] No claim that hosted behind-login scanning exists (behind-login is the local CLI only)
