# Needs approval (not done)

- Hosted behind-login scanning: DESIGN.md says it is deliberately not built (CLI-only). Marketing must not imply otherwise.
- A public changelog or status page: adds routes and content to maintain.
- Customer logos, testimonials, ratings, user counts: no real data in the repo.
- Any change to routes, URLs, pricing amounts, plan names, billing or auth logic: none made.
- Paid image generation beyond the $4 Magica budget: none made, $0 spent.
- Unsourced competitor price claims on /pricing ("Compared to the alternatives"): pre-existing copy, left as is. Needs sourcing before launch.
- CLI default output names (`mpersonas-report`, `mpersonas-baseline.json`) still carry the old product name in `src/cli.ts` and the docs that quote it. Renaming changes CLI behavior, so it was not done.
- Printable client report (`/audits/[id]/report`): collapse the repeated "Partially Supports" WCAG rows and restack the conformance and verdict tables on phones. Touches the export that agencies hand to clients, so it needs a human decision.
- Project detail page: the scan task sits below a divider and the checkbox help text is five lines. A restructure of app workflow screens, not a visual pass.
- Dashboard empty state: "No saved grades yet" (public-grade history) sits under a real "Latest run" (audits). Needs a copy decision on what each list is called.
