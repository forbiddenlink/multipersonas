# Personaudit Design Direction — Forensic Evidence Terminal

**Canonical.** Matches `docs/superpowers/specs/2026-07-28-forensic-terminal-redesign-design.md`
and the live token layer in `src/app/globals.css` + `src/app/layout.tsx`.
If this file disagrees with those, the code/spec win — update this doc.

## Product Identity

**Category:** Accessibility scanning + persona task-success (not a disability simulator)
**Users:** Agencies, freelancers, QA / a11y consultants shipping many client sites
**Emotional response:** Authority, precision, forensic trust — an instrument, not a chatbot
**Differentiator:** Dark warm mono-forward evidence UI. Nobody in the a11y category owns this.

## The Single Design Move

**The live audit log is the brand.** Show the instrument working — axe verdicts landing
in severity color, personas reporting task-success — not a polished fake dashboard mock.

## Design References (steal discipline, not cosmetics)

| Source | What to steal | Avoid stealing |
|--------|---------------|----------------|
| **Linear** | Interaction completeness (6 states), density rhythm, teal/accent demotion, flat tiled surfaces | Indigo brand, Inter-as-identity |
| **Raycast** | Keyboard-first affordances, compact rows, instant feedback | Soft glass panels |
| **Resend / Vercel** | Restraint, typography hierarchy, one focal point per section | Gradient mesh heroes |
| **Stark / Polypane** | Product-as-demo, multi-pane concept adapted to personas | Soft marketing card grids |
| **Siteimprove** | Score-as-meter language (we use thin meters, not glossy donuts) | Enterprise navy + logo walls |
| **uiverse / termcn / shadcn log blocks** | Microinteraction *ideas* (prompt cursor, scanline loader, hover border) | Neon glows, glitch, traffic-light window dots, glassmorphism |
| **sysui Terminal theme** | Prompt/host framing, panel chrome vocabulary | Cyberpunk neon / hologram effects |

Inspiration workflow: search specific components (empty state, log row hover, focus ring,
severity chip, meter) — never paste a whole aesthetic. Translate into our tokens.

## Token System (locked)

### Fonts
- **Mono — JetBrains Mono** (`--font-mono`): logs, rule IDs, counts, meters, tool labels, wordmark accent
- **Sans — Inter** (`--font-sans` / `--font-heading`): copy, CTAs, tight headings
- **Serif — Source Serif 4** (`--font-serif`): report verdict body, WCAG citations, guide prose

Retired: DM Serif Display (display face, wrong for document body).

### Color
Warm near-neutral hue **70**. Dark-first. Teal hue **195** DEMOTED to active/live/cursor ONLY.

```
/* Dark (default) */
--background: oklch(0.15 0.006 70)
--card:       oklch(0.19 0.006 70)
--foreground: oklch(0.96 0.004 70)
--primary:    oklch(0.72 0.12 195)   /* live/cursor only — not every CTA */
--severity-critical: oklch(0.65 0.20 25)
--severity-serious:  oklch(0.72 0.16 55)
--severity-moderate: oklch(0.80 0.13 85)
--severity-minor:    oklch(0.70 0.12 250)  /* pulled off teal */
```

Light = "paper lab" variant (same system, warmer off-white). Report paper is always white
ink-on-paper regardless of app theme.

### Radius
`--radius: 0.375rem`. Prefer `rounded-sm` / `rounded-md`. No soft SaaS `rounded-xl` /
`rounded-full` pills on product chrome.

### Severity (always color + glyph + text)
```
■ critical · ▲ serious · ◆ moderate · ● minor
```
Source of truth: `components/forensic/severity.ts`. Never color-only. Never severity on
persona *opinion* (honesty wall).

## Component Primitives

| Primitive | File | Role |
|-----------|------|------|
| Wordmark | `forensic/wordmark.tsx` | Mono name + teal cursor |
| SeverityChip | `forensic/severity-chip.tsx` | Outline chip (no tint fill — AA) |
| Meter | `forensic/meter.tsx` | CI fraction + thin bar |
| BoxDivider | `forensic/divider.tsx` | Box-drawing section markers |
| Monogram | `forensic/monogram.tsx` | Deterministic persona tile |
| ReportExcerpt | `forensic/report-excerpt.tsx` | VPAT-lite sample |
| FocusDemo / ContrastBadge | dogfood band | Credibility proof |
| AuditTerminal | `audit-terminal.tsx` | Signature hero asset |
| EmptyPrompt | `forensic/empty-prompt.tsx` | Terminal-native empty states |

## Layout Patterns

### Marketing
Hero = grain + tight Inter headline + live AuditTerminal → dogfood band → scan form →
how-it-works as run-log → honesty wall → report excerpt → CTA → Wordmark footer.

### App (observability console)
Mono nav labels, teal left-border active marker, dense log rows for audits/projects,
scan form as `› new scan` console input. Flat surfaces; borders do hierarchy, not shadows.

### Report
Paper stays paper (`report.module.css` print contract untouched). On-screen = console
toolbar frame; print = white document.

## Motion

- 150ms hover/focus · 300ms state · 500ms entrance
- Transform + opacity only; exponential ease-out
- Always honor `prefers-reduced-motion` (terminal already ships a static complete frame)
- No scroll-triggered gimmicks that hide content without JS (`data-reveal` + noscript)

## Interaction Completeness (Linear lesson)

Every interactive control needs designed: default · hover · focus-visible · active ·
disabled · loading. Focus rings are a *feature* (thick, offset, teal) — dogfood them.

## Anti-patterns (do NOT)

- Purple-to-blue / pink mesh gradients
- Soft `rounded-xl` card grids + icon+title+blurb feature rows
- Fake traffic-light window dots
- Glossy SVG donut score rings
- `text-muted-foreground/60` (fails AA — use full muted)
- Severity as filled tint chips (fails AA on 10% fills)
- Neon glow / glitch / glassmorphism decoration
- Disability-simulation personas or costume UI
- Logo walls, star badges, fake social proof
- "Get started" / dual Book-demo CTAs
- Blurring Verdict / Task-success / Opinion in the UI

## Content Gaps Still Worth Filling

1. Real product screenshots of the *app* console (auth-gated — need signed-in capture)
2. Demand distribution for `/for-agencies` (outreach kit exists; traffic does not)
3. CI-gate docs surface for agencies (CLI exists; marketing/docs can go deeper)
4. Session-artifact UX — **only after demand pull** (ADR 0001)

## Build North Star

If someone says "AI made this," we failed. If they say "this looks like a diagnostic
instrument," we succeeded.
