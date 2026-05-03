# MultiPersonas Design Direction

## Product Identity

**Category:** AI-powered accessibility & UX testing tool
**Users:** Web developers, QA engineers, product managers, accessibility consultants
**Emotional response:** Authority, precision, trust
**Competitive position:** Serif typography is a genuine differentiator — no competitor uses it. Keep it.

## Design References

| Product | What to steal | URL |
|---------|--------------|-----|
| **Stark** | Compound hover effects (scale + rotate + shadow) on cards, 0.15-0.3s animation timing | getstark.co |
| **Polypane** | Responsive pane displays showing multiple viewports side-by-side — maps directly to persona simulation | polypane.app |
| **Siteimprove** | Donut chart / SVG ring for accessibility scores, pass/fail color coding | siteimprove.com |
| **Level Access** | Atkinson Hyperlegible font (font IS the brand message for a11y), glow effects on dark backgrounds | levelaccess.com |
| **Applitools** | Large-number metrics approach ("3 personas, 47 issues, 12 WCAG violations") | applitools.com |
| **Linear** | Extreme restraint — colors communicate, don't decorate. Semantic variable hierarchy. | linear.app |

## Color Palette

### Primary — Teal (current, validated)
Multiple competitors (Axe, Polypane, Applitools) use teal. It's correct for the category — signals analytical precision.

```
--primary:           oklch(0.72 0.12 195)    /* #3bb8a8 — buttons, rings, links */
--primary-foreground: oklch(0.15 0.01 195)   /* dark teal — text on primary */
```

### Semantic colors — per severity
```
--severity-critical: oklch(0.65 0.20 25)     /* #d94f3d — red, critical issues */
--severity-serious:  oklch(0.72 0.16 55)     /* #d4883a — amber/orange */
--severity-moderate: oklch(0.78 0.12 85)     /* #c4a843 — yellow */
--severity-minor:    oklch(0.72 0.10 195)     /* teal — informational */
```

### Persona accent colors (future use)
Each persona type gets a distinct accent for visual identification:
```
--persona-screen-reader: oklch(0.68 0.14 280)  /* purple — assistive tech */
--persona-first-time:    oklch(0.75 0.12 85)   /* amber — cautious explorer */
--persona-mobile:        oklch(0.70 0.15 160)  /* green — connectivity */
```

### Surfaces (current, validated)
Blue-tinted neutrals at 0.004-0.008 chroma, hue 240:
```
--background: oklch(0.13 0.004 240)    /* near-black, cool */
--card:       oklch(0.17 0.005 240)    /* elevated surface */
--muted:      oklch(0.22 0.008 240)    /* recessed surface */
```

### What to AVOID
- Purple as primary (shared with Stark, AudioEye — won't differentiate)
- Blue-500 / blue-600 (corporate, generic)
- Green as primary (confuses with "pass" status)
- Warm backgrounds (signals consumer, not developer tool)

## Typography

### Current pairing (validated, keep)
- **Display:** DM Serif Display 400 — hero headlines, section titles
- **Body:** Inter — UI text, descriptions, form labels

### Why it works
DM Serif Display is editorial and authoritative. In a field where every competitor uses sans-serif, this is a genuine brand signal. It communicates: "this is a considered analysis, not a quick scan."

Inter is the developer standard. It provides technical credibility that balances the serif's editorial tone.

### Type scale
```
h1 (hero):     text-4xl sm:text-5xl lg:text-6xl  font-heading font-bold
h2 (section):  text-2xl                           font-heading font-semibold
h3 (card):     text-lg                            font-sans font-medium
body:          text-base                           font-sans font-normal
caption:       text-sm                             font-sans text-muted-foreground
small:         text-xs                             font-sans text-muted-foreground
```

### Future consideration
Atkinson Hyperlegible for body text — a font literally designed for readability. For an accessibility testing tool, the font choice itself becomes a brand statement. Evaluate swapping Inter for Atkinson Hyperlegible in a future iteration.

## Layout Patterns

### Landing page (current structure)
```
Header (nav)
Hero (serif headline + URL input)
  → Connecting timeline steps (not a 3-column grid)
Bottom CTA
```

### Dashboard (post-login)
```
Sidebar (nav + user)
Main canvas:
  → Audit form card (URL input)
  → Results: score ring + persona cards side-by-side
  → Findings list with severity badges
```

### Future: Audit results page
Take from Polypane — show 3 persona viewports side-by-side:
```
┌─────────────────────────────────────────────┐
│ Score ring (overall)                         │
├──────────┬──────────┬───────────────────────┤
│ Persona 1│ Persona 2│ Persona 3             │
│ Score: 82│ Score: 45│ Score: 71             │
│ Steps: 12│ Steps: 8 │ Steps: 15            │
│ ───────  │ ───────  │ ───────              │
│ Findings │ Findings │ Findings             │
└──────────┴──────────┴───────────────────────┘
```

### Future: Persona detail view
Editorial layout — timeline of steps the persona took, with screenshots:
```
Step 1: Landed on homepage
  [screenshot] → "Missing h1 heading" (critical)
Step 2: Clicked "Sign up"
  [screenshot] → "Form labels not associated with inputs" (serious)
```

## Icon Strategy

- **Library:** Lucide (already installed)
- **Style:** Outlined, 1.5px stroke — matches the minimal dark aesthetic
- **Where custom icons matter:** Persona avatars. Each persona should have a distinctive icon/illustration, not just a colored circle with a letter.
- **Where stock is fine:** Navigation, form controls, severity indicators

## Micro-interactions & Motion

### Priority implementations
1. **Score ring animation** — SVG stroke-dashoffset animating from 0 to score value on mount. Reference: Siteimprove.
2. **Card hover** — `scale(1.02)` + elevated shadow + subtle border glow. Timing: 150ms ease-out. Reference: Stark.
3. **Persona status pulse** — During audit, each persona card pulses its accent color while "browsing." Already have `animate-pulse` — refine to use persona-specific colors.
4. **Number count-up** — Animate score numbers from 0 to final value on results load. Use `requestAnimationFrame`, not a library. Reference: Polypane's Odometer.
5. **Page transitions** — View Transitions API (native, no library) for navigating between landing → auth → dashboard. Subtle crossfade, 200ms.

### Motion principles
- 150ms for hover/focus (instant feedback)
- 300ms for state changes (loading → complete)
- 500ms for entrance animations (results appearing)
- Always respect `prefers-reduced-motion`
- No scroll-triggered animations on the landing page (developer audience finds them annoying)

### Tools
- CSS transitions for hover/focus (no library needed)
- Framer Motion only if building complex sequences (not needed yet)
- Native View Transitions API for page transitions (progressive enhancement)

## Content Gaps to Fill

### Highest impact additions (in priority order)
1. **Sample audit result** on landing page — show what the output looks like before asking for signup
2. **Large metrics** in hero or below: "3 personas. Real browsers. Actual WCAG violations." Numbers > descriptions.
3. **Footer** — missing entirely. Add: product links, legal, GitHub link, WCAG version tested
4. **Product screenshot/preview** — competitors all show their dashboard. Show yours.

### Lower priority
- Customer logos (need actual customers first)
- Testimonials (need actual users first)
- Comparison table vs Axe/WAVE/Lighthouse
- Persona illustrations (custom SVGs for each persona type)

## Anti-patterns to AVOID

- Purple-to-blue gradient heroes (2024-2025 AI slop)
- "Join 10,000+ teams" with fake social proof
- Three identical pricing cards
- Glassmorphism everywhere
- "Get started" / "Watch demo" generic CTAs (already fixed)
- Feature grids with icon + title + 2 sentences (already fixed to timeline)
- Oversized hero with no product preview
- Stock photos of diverse people using laptops
- Dashboard screenshots with fake data that looks too clean

## The Single Design Move

**Show the three personas browsing simultaneously.**

Every competitor shows a single-view test result. MultiPersonas' unique value is showing THREE different perspectives of the same page at once. The visual of a screen reader user, a first-time visitor, and a mobile user all navigating the same site — each finding different issues — is the product's visual identity.

Build toward: a hero section or dashboard view that shows three parallel "browser windows" with different personas browsing, each highlighting different problems. This is the Polypane responsive-pane pattern adapted for personas instead of viewports.
