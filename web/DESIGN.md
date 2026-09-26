# Personaudit design system: Evidence Dossier

**Canonical, locked 2026-09-26.** Replaces the retired "Forensic Evidence Terminal" system.
The token layer lives in `src/app/globals.css` and the fonts in `src/app/layout.tsx`. If this
file and the code disagree, the code wins and this file gets updated.

Reference implementation: `src/app/page.tsx` (home), `src/components/dossier/evidence-sheet.tsx`,
`src/components/site-header.tsx`, and `src/components/site-footer.tsx`. Match them.

## Idea

The product sells evidence an agency hands to a client. So the brand is the **case file**:
warm manila desk, near-white sheets of paper, blue-black ink, a redline annotator, a
highlighter, a rubber stamp. It must never look like a dark dev-tool terminal or a
gradient SaaS template. The standard to hit: "this looks like a document I'd trust in a legal
file", not "an AI made this".

Genre: editorial. Light-first. Dark ("night desk") is a supported secondary theme.

## Tokens (use names, never raw values)

| Role | Token | Notes |
|---|---|---|
| Desk (page) | `--background` / `bg-background` | warm manila |
| Sheet (surface) | `--card` / `bg-card`, `.sheet` | near-white paper + `--shadow-sheet` |
| Ink | `--foreground` | blue-black |
| Secondary ink | `--muted-foreground` | ≥ 6.4:1 on desk; never use `/60` opacities on text |
| CTA + links | `--primary` (ink blue) | one filled primary per view |
| Annotation | `--redline` / `text-[var(--redline)]` | margin notes, stamps, "net new", critical |
| Highlighter | `--highlight`, `.mark` | marks the evidence phrase inside prose |
| Rules | `--border` | hairlines; `border-foreground` 2px for document heads |
| Severity | `--severity-{critical,serious,moderate,minor}` | always glyph + color + text via `SeverityChip` |

Radius is `--radius` (3px). Use `rounded-sm`. No `rounded-xl`, no pills on product chrome.
No gradients, no glow, no glassmorphism, no drop shadows except `.sheet`.

## Type

- **Display: Newsreader** (`.display` class, or `font-serif`). Weight 500, tracking −0.022em,
  upright only. **Never italic headings.** H1 `clamp(2.6rem,5.6vw,4.5rem)`, H2
  `clamp(1.9rem,3.4vw,2.6rem)`, leading ~1.05.
- **UI + copy: IBM Plex Sans** (`font-sans`, default). Body 16–18px, `leading-relaxed`,
  measure ≤ 65ch (`max-w-xl`/`max-w-2xl`).
- **Evidence: IBM Plex Mono** (`font-mono`). Rule IDs, WCAG codes, file numbers, counts,
  commands, tables of numbers (`tabular-nums`).
- **Eyebrow:** `.label-mono` (11px uppercase mono, muted). At most one per section, stacked
  above its heading, never beside it.
- Long-form prose (guides, legal, report body): `font-serif` at 1.0625–1.125rem.

## Layout

- Every section uses `.frame` (72rem, 1.25rem → 2rem gutters) or `.frame-narrow` (46rem) so
  **all left edges line up**. Never invent a new `max-w-* mx-auto px-*` wrapper.
- Vertical rhythm: `.section-y` (large) / `.section-y-sm`. Alternate `bg-background` and
  `bg-card` bands with a `border-y border-border` to change "paper".
- Asymmetric two-column grids (`lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`), not
  3-up icon card rows. Always `minmax(0,…)` tracks and `min-w-0` on children.
- Numbered procedures, ledgers (tables with a 2px `border-foreground` head), and document
  sheets are the preferred shapes. Avoid rows of identical rounded cards.

## Signature primitives (in `globals.css`)

| Class | Use |
|---|---|
| `.sheet` | a piece of paper on the desk |
| `.margin-rule` | legal-pad redline down the left of a sheet (needs `pl-12`+) |
| `.file-tab` | "Case PA-0426 · host" tab on top of a sheet |
| `.stamp` | verdict stamp; max one per viewport |
| `.mark` | highlighter over the key evidence phrase |
| `.redline-note` | annotator voice, mono, redline color |
| `.ruled` | faint ledger lines, decorative only |
| `.text-link` | inline body link (ink blue, underline, instant focus ring) |
| `.label-mono` | eyebrow / field label |
| `.display` | headings |

## Components

- **Primary CTA:** `Button` default (ink-blue fill, 1px inset bottom shade), `size="lg"`
  (h-11/h-12) on marketing. Copy is a verb + object: "Grade a site free", "Save project",
  "Export report". Never "Get started", never "Learn more".
- **Secondary:** `.text-link` or `Button variant="outline"`. Never two filled buttons side by side.
- **Inputs:** h-11/h-12, `border-input`, `bg-card`, mono for URLs, visible label (`.label-mono`)
  above, hint text below, error in redline with a `■` glyph and `role="alert"`.
- **Severity:** `SeverityChip` only (outline, glyph, label, WCAG id).
- **Empty states:** a blank sheet with one sentence and one action. No illustrations.
- **App shell:** light sheet sidebar/topbar, ink text, active item marked with a 2px ink-blue
  left rule. Dense tables over cards.

## Interaction

States required on every control: default · hover · focus-visible · active · disabled ·
loading (and error/success where relevant). Focus ring: 2px `--ring`, 2px offset, never
animated. Motion: 150ms color, 300ms state, `--ease-out`; transform/opacity only; honor
`prefers-reduced-motion`. Silent success over celebratory toasts.

## Content rules (honesty wall — non-negotiable)

- axe-core findings = the only compliance output. Persona output = task success + labeled
  AI opinion. Never blur the two. Never simulate or imply disabled users.
- No invented metrics, logos, testimonials, or customer counts. Real numbers come from
  `experiments/` (see `src/lib/probe-ledger.ts`, `src/lib/sample-evidence.ts`) and are
  labeled "probe" / "sample".
- Hosted behind-login scanning is **not built**: behind-login is CLI-only. Don't imply otherwise.
- No em dashes in UI copy. Second person, present tense, sentence-case headings.

## Anti-patterns (do not ship)

Dark terminal heroes · fake window chrome / traffic-light dots · gradient meshes · icon +
title + blurb 3-card rows · `rounded-xl` cards · grey disabled-looking primary buttons ·
italic headings · logo walls · star ratings · "Get started" · text below 4.5:1.
