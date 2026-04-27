# MultiPersonas — Complete Product & Implementation Plan

> AI-powered testing platform that simulates diverse user personas interacting with websites and codebases, surfacing UX issues, accessibility failures, and persona conflicts before real users hit them.

---

## Table of Contents

1. [Market Position & Competitors](#market-position)
2. [Core Architecture](#core-architecture)
3. [Browser Agent Engine](#browser-agent-engine)
4. [Persona System](#persona-system)
5. [Accessibility Simulation Suite](#accessibility-simulation)
6. [Codebase Analysis Engine](#codebase-analysis)
7. [Results & Dashboard UX](#results-dashboard)
8. [CI/CD & Developer Workflow](#cicd)
9. [Tech Stack (Final)](#tech-stack)
10. [Database Schema](#database-schema)
11. [Pricing & Monetization](#pricing)
12. [Security & Auth Model](#security)
13. [Multi-Tenant Architecture](#multi-tenant)
14. [Error Handling & Reliability](#reliability)
15. [Scaling Architecture](#scaling)
16. [Observability & Analytics](#observability)
17. [Integrations & Exports](#integrations)
18. [Persona Validation](#validation)
19. [Go-to-Market & Positioning](#gtm)
20. [Implementation Phases](#implementation-phases)
21. [Key Technical Decisions](#decisions)
22. [Success Metrics](#metrics)
23. [Research Sources](#sources)

---

## 1. Market Position & Competitors {#market-position}

### Why This Wins

No existing tool combines all four:
1. **Browser automation** with real persona behavior simulation (not screenshots)
2. **Codebase analysis** through persona lenses (nobody does this)
3. **Accessibility simulation** beyond WCAG checkers (actual condition simulation via CDP)
4. **CI/CD integration** with persona-based pass/fail gates on PRs

### The Industry Trust Problem

The UX research community is skeptical of AI testing. Key voices:
- **NNGroup** tested synthetic users against 3 real studies: responses felt "one-dimensional" and "too shallow to be useful"
- **Jared Spool**: "absolutely the wrong direction for UX professionals"
- **Baymard Institute**: ChatGPT-4 had an **80% error rate** in UX audits
- 68% of UX researchers are concerned about AI's impact on their roles

**The five complaints about ALL AI testing tools:**
1. **Sycophancy** — synthetic users are "way too nice," endorse every idea enthusiastically
2. **Too generic** — long lists of issues with no prioritization, nothing specific enough to create a ticket from
3. **No real behavioral data** — can't actually click, hesitate, abandon like humans
4. **Hallucination/staleness** — models can't surface emerging user behaviors
5. **No trust framework** — no tool publishes hit/miss rates against real research

**Our positioning counter:** We don't replace user research. We are the **automated UX layer for CI pipelines** — "AI for speed, humans for truth." Position findings as hypotheses with confidence scores, not verdicts. Ship behavioral data (real browser interaction), not just attitudinal data (LLM opinions).

---

### Deep Competitive Analysis

#### Snap by Versive — YC W23, Team of 3

**How it works:** Upload Figma prototype, paste live URL, or upload screenshots (even physical products). Define AI personas by uploading user files/text. AI navigates the product "thinking aloud." Results in minutes: synthesized report, transcripts, video replay, accessibility violations, cross-persona summary.

**Figma plugin:** Select frames directly, test without leaving Figma. Key UX advantage for designers.

**Strengths we must match:**
- Multi-input (URL + Figma + screenshots + physical products)
- Video replay of AI navigation (compelling for stakeholders)
- Cross-persona synthesis reports
- Speed ("minutes")

**Weaknesses we exploit:**
- No public pricing (friction)
- No G2 reviews — very early market adoption
- No heatmaps, no click maps, no A/B testing
- No CI/CD, no developer API, no programmatic access
- Trust problem: LinkedIn comments on YC announcement showed repeated skepticism
- Tiny team (3 people) limits execution bandwidth
- Unclear if it actually browses URLs or analyzes screenshots

#### Uxia — #1 Product Hunt (462 upvotes, 107 comments)

**How it works:** Input Figma/Sketch/Adobe XD or live URL. Define audience profile + task. AI synthetic testers explore independently. Results in ~5min: think-aloud transcripts, session recordings, AI-generated heatmaps, click maps, cognitive analysis, WCAG 2.2 AA/AAA report. Also supports real human testing via invite links.

**Strengths we must match:**
- AI-generated heatmaps and click maps (Snap has neither)
- WCAG 2.2 AA/AAA accessibility reporting
- Hybrid model: synthetic + real human testing addresses trust problem
- A/B testing support (compare design variants)
- Flat monthly pricing with unlimited tests

**Weaknesses we exploit:**
- No public API, zero developer/CI integration
- Opaque pricing (sales-required custom plans)
- Single-account policy forces enterprise sales motion
- Heatmaps are AI-predicted, NOT actual cursor data (fundamentally different from Hotjar/FullStory)
- No Figma plugin (web-only)
- Cannot capture emotional response or cultural nuance

#### Synthetic Users — Most Sophisticated Persona Engine

**How it works:** Define target participants. Four-agent architecture (Planner, Interviewer, Critic, Router) runs interviews. Router dynamically selects LLMs (GPT-4 primary, ensemble for diversity). Up to 10 synthetic users per study. Results in ~2min: transcripts, insights report, follow-up questions.

**OCEAN integration is genuinely deep:** Calibrated against real demographic cohorts by geography/industry/segment. Proprietary behavioral datasets map to trait signals. Drift detection monitors parity against organic interviews.

**RAG feature:** Upload CRM data, product docs, survey results. RAG retrieves at response-time to ground responses in your business context.

**Claims 85-92% organic parity rate.** But known sycophancy bias — one documented case: synthetic user claimed to "always complete online courses" while real humans rarely do.

**Pricing:** $2-60/interview (not $2-27 as originally found). Has API + SDK documentation.

**Strengths we must match:**
- OCEAN-calibrated persona depth against real population data
- Four-agent architecture with LLM routing
- Post-interview follow-up questions
- API available for developer integration
- Published validation methodology

**Weaknesses we exploit:**
- **Conversational only** — cannot actually browse sites or interact with products
- Max 10 users per study
- Sycophancy bias well-documented
- Outputs are qualitative transcripts, not actionable reports with screenshots/selectors
- No behavioral data grounding from real analytics
- Enterprise pricing opacity

#### Blok — $7.5M Raised, Still in Waitlist

**How it works:** Connect Amplitude/Mixpanel/Segment event logs. Behavioral modeling creates personas from actual usage patterns. Submit Figma design + experiment details. Persona agents test task completion, drop-offs, emotional response. Results in ~30min.

**Claims 87% behavioral fidelity** when backtested against real data. Testimonials from Meta, Spotify, Uber Eats, Booking.

**Strengths to note:**
- Grounding personas in REAL analytics data (actual user behavior, not hypothetical profiles) — most defensible approach
- Enterprise credibility (advisor network from Meta, Discord, Airbnb, Google, etc.)

**Weaknesses we exploit:**
- **Still behind a waitlist** — not generally available
- No public API, no public pricing, no self-serve
- SOC 2 still in audit
- Figma only — no live URL testing
- No community, no reviews, no track record
- Results in 30min (slow vs our target of ~5min)

#### Qwarm — QA Tool with Persona Label

**How it works:** Write tests in plain English. AI resolves DOM elements, executes in Chromium via Playwright. Two modes: QA (find bugs) and Focus Group (evaluate UX through personas). Swarm Mode launches 5+ personas simultaneously. Discovery Mode auto-generates test flows.

**Pricing:** Free (3 runs/mo), Pro $29/mo (50 runs), Team $79/mo (200 runs).

**Threat level: LOW.** Fundamentally a QA automation tool. Focus Group mode is a label, not deep persona simulation. Personas appear to be fixed archetypes with free-text instructions, not structured profiles. Competes more with testRigor than with us.

#### PersonaIQ — Closest Concept, Very Early Stage

**How it works:** Pre-built persona library (Skeptical CFO, Confused Senior, Power User Dev, Accessibility Guru). Provide live URL + goal. Claims real browser interaction. Delivers friction scores, think-aloud transcripts, heatmaps, buy/no-buy verdicts.

**Pricing:** $49+ (vs $245 for 5-person human study).

**Threat level: MEDIUM.** Most similar concept to ours. But: site returning 403 (very early), zero public reviews, no API/CI, opaque methodology. Explicitly positions as "not a replacement for deep qual research" — smart framing we should adopt.

#### Open Source Landscape

| Project | Stars | License | Threat |
|---------|-------|---------|--------|
| **UXAgent** (Amazon Science) | 77 | MIT (implied) | Validates concept. Research-grade, not production. Someone could fork + commercialize. |
| **Browser Use** | 88,654 | MIT | Foundation layer. Nobody has built persona testing on top yet. |
| **Stagehand** (Browserbase) | 22,139 | MIT | Could be extended for persona testing. |
| **TinyTroupe** (Microsoft) | 7,398 | MIT | Sophisticated persona modeling. No browser interaction. |
| **TestZeus Hercules** | 981 | AGPL-3.0 | AI testing agent with a11y. AGPL blocks commercial use. No personas. |
| **claude-chrome-user-testing** | 14 | — | Claude plugin simulating generational personas. Proves someone is trying. |

**Key finding:** Nobody has combined Browser Use's browser automation (88K stars) with TinyTroupe's persona modeling (7K stars) into a product. That's essentially what we're building.

---

### Competitive Matrix

| Feature | MultiPersonas | Snap | Uxia | Synthetic Users | Blok | PersonaIQ | Qwarm |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Real browser interaction | Yes | Unclear | Unclear | No | No | Claims yes | Yes |
| Structured persona profiles | Yes | File upload | Demographics | OCEAN-calibrated | From analytics | Archetypes | Free text |
| Custom persona creation | Yes | Yes | Yes | Yes | Auto from data | Describe your own | Instructions |
| Accessibility simulation (CDP) | Yes | No | WCAG report | No | No | No | No |
| Codebase analysis | Yes | No | No | No | No | No | No |
| CI/CD integration | Yes | No | No | No | No | No | No |
| Developer API | Yes | No | No | Yes | No | No | Coming soon |
| Heatmaps/click maps | Yes | No | AI-predicted | No | No | Yes | No |
| Session replay | Yes | Video | Video | No | No | No | Screenshots |
| Conflict detection | Yes | No | No | No | No | No | No |
| A/B testing | Future | No | Yes | No | Yes | No | No |
| Transparent pricing | Yes | No | No | Partial | No | Partial | Yes |
| Self-serve | Yes | Yes | Yes | Yes | No (waitlist) | Yes | Yes |
| Figma integration | Future | Plugin | Web | No | Input | No | No |
| Real human testing | Future | No | Yes | No | No | No | No |
| Published validation | Planned | No | No | 85-92% claimed | 87% claimed | No | No |

### Our Moat (Updated)

1. **Real browser interaction with transparent methodology** — We actually browse. We say how. Others are ambiguous.
2. **Persona Conflict Detection** — Matrix showing where fixing for Persona A breaks Persona B. Nobody does this.
3. **Codebase-level persona testing** — "Would a junior dev understand this error message?" Nobody does this.
4. **CDP accessibility simulation** — Vision deficiency emulation, keyboard-only nav, cognitive load scoring. Others do WCAG rules only.
5. **CI/CD persona gates** — Run persona tests on every PR, block on regressions. No competitor has this.
6. **Confidence-scored findings** — "Likely issue" vs "Worth investigating." Addresses the trust crisis directly.
7. **Transparent pricing, self-serve** — Most competitors hide pricing behind sales. We don't.
8. **Developer-first** — API, CLI, GitHub Action, SARIF export. Every competitor is designer-first or researcher-first.

### How We Beat Each Competitor

| Competitor | How We Win |
|-----------|-----------|
| **Snap** | Real browser interaction (not screenshots), CI/CD, API, transparent pricing, accessibility depth |
| **Uxia** | Developer workflow (CI/CD, API, CLI), real behavioral data (not predicted heatmaps), transparent pricing |
| **Synthetic Users** | Actually test products (not just interview), real browser data, CI/CD, specific findings with selectors/screenshots |
| **Blok** | Self-serve (they're waitlist), live URL testing (they're Figma only), ship faster, transparent pricing |
| **PersonaIQ** | Deeper persona model, CI/CD, API, published validation methodology, structured accessibility |
| **Qwarm** | Deep persona modeling vs shallow archetypes, accessibility simulation, conflict detection, codebase analysis |
| **UXAgent** | Production-quality SaaS vs research-grade code, dashboard, CI/CD, team features, support |

---

## 2. Core Architecture {#core-architecture}

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Vercel (Next.js)                         │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────────────┐│
│  │ Dashboard  │  │ API Routes │  │ Server Actions            ││
│  │ shadcn/ui  │  │ (CRUD)     │  │ (trigger runs, generate  ││
│  │ Recharts   │  │            │  │  personas, stream results)││
│  └───────────┘  └────────────┘  └──────────────────────────┘│
│        ↕ Supabase Realtime (live test progress)              │
└──────────────────────┬───────────────────────────────────────┘
                       │ enqueue job
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  Trigger.dev v3 (Job Queue)                    │
│                                                               │
│  triggerTestRun(testRunId)                                    │
│    ├── fan-out: runPersonaTest(personaId) × N  [parallel]    │
│    │     1. Build persona system prompt                       │
│    │     2. Launch Playwright browser context                 │
│    │     3. Apply persona constraints (CDP)                   │
│    │     4. Agent loop:                                       │
│    │        a. Get accessibility tree snapshot                │
│    │        b. (Optional) Take scoped screenshot              │
│    │        c. LLM decides next action (tool call)            │
│    │        d. Playwright executes action                     │
│    │        e. Run axe-core + persona-specific checks         │
│    │        f. Write findings to DB incrementally             │
│    │        g. Repeat until goal complete or budget exhausted │
│    │     5. Generate persona session summary                  │
│    └── fan-in: generateReport(testRunId) [after all complete]│
│          - Aggregate findings across personas                 │
│          - Detect persona conflicts                           │
│          - Generate AI summary (Claude Opus)                  │
└──────────┬──────────────┬─────────────────┬──────────────────┘
           │              │                 │
    ┌──────▼──────┐ ┌────▼──────┐  ┌───────▼────────┐
    │ Playwright   │ │ Claude    │  │ Supabase        │
    │ (Railway     │ │ API       │  │ Postgres + Auth │
    │  Docker)     │ │ (AI SDK   │  │ + Storage       │
    │              │ │  v6)      │  │ + Realtime      │
    └─────────────┘ └───────────┘  └─────────────────┘
```

### Key Architectural Decisions

- **Fan-out/fan-in job pattern**: Each persona runs as an independent Trigger.dev task. All run in parallel. A final aggregation task runs after all complete.
- **Incremental DB writes**: Findings written to DB as they're discovered, not batched. Dashboard shows results streaming in via Supabase Realtime.
- **Accessibility tree as primary page representation**: Token-efficient, structurally rich. Screenshots only for visually complex elements or evidence capture. Based on research showing DOM-based representations outperform screenshot-only approaches for reliability.
- **Deterministic + AI hybrid**: Static checks (axe-core, contrast, target size) run every time. LLM adds subjective persona-specific evaluation on top.

---

## 3. Browser Agent Engine {#browser-agent-engine}

### Agent Architecture

Based on research into Browser Use (81k+ GitHub stars), Stagehand v3 (Browserbase), UXAgent (Amazon Science), and PersonaTester — our agent combines the best patterns:

**Dual-process reasoning loop** (from UXAgent's cognitive dual-process theory):
- **Fast Loop**: Rapid interaction decisions (click, scroll, type). Uses accessibility tree snapshot → LLM tool call → Playwright execution.
- **Slow Loop**: Strategic planning. Every N steps, the agent pauses to reflect: "Am I making progress toward my goal? Should I change approach?" Prevents aimless wandering.

**Three atomic primitives** (inspired by Stagehand v3):
- `act(instruction)` — Perform an action on the page
- `extract(query)` — Pull structured data from current page state
- `observe(question)` — Evaluate current state against persona criteria

**Auto-caching** (from Stagehand): Cache discovered element selectors so repeat actions skip LLM inference. Self-healing re-engages AI only when the site changes.

### Page Representation Strategy

```
Primary: Accessibility tree snapshot (page.accessibility.snapshot())
  - Token efficient (~500-2000 tokens per page vs 10K+ for full DOM)
  - Contains role, name, value, hierarchy for every element
  - Essentially what a screen reader sees

Secondary: Scoped screenshots (triggered by agent)
  - Taken when agent needs visual context (layout evaluation, color assessment)
  - Encoded as base64, sent to vision model
  - Used for evidence capture on findings

Tertiary: DOM metadata (on demand)
  - CSS computed styles for specific elements (contrast ratios, font sizes)
  - Network timing data
  - Console errors
```

### Persona Constraint Application

Applied at browser context level before agent loop starts:

```typescript
// Vision deficiency simulation (CDP protocol)
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setEmulatedVisionDeficiency', {
  type: persona.accessibilityNeeds.find(n => n.type === 'vision')?.cdpType ?? 'none'
});
// Supported: protanopia, deuteranopia, tritanopia, achromatopsia, blurredVision

// Custom vision filters (cataracts, macular degeneration)
// Injected as SVG filters via page.addStyleTag()

// Network throttling (CDP)
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: connectionPresets[persona.deviceProfile.connection].download,
  uploadThroughput: connectionPresets[persona.deviceProfile.connection].upload,
  latency: connectionPresets[persona.deviceProfile.connection].latency,
});

// CPU throttling (old device simulation)
await cdp.send('Emulation.setCPUThrottlingRate', {
  rate: persona.deviceProfile.cpuThrottleRate ?? 1  // 4 = quarter speed
});

// Viewport + device emulation
await page.setViewportSize(persona.deviceProfile.screenSize);

// Tremor simulation (Gaussian jitter on clicks)
// Override page.mouse.click to add random offset
```

### Behavioral Modifiers

The LLM prompt includes persona-specific behavior instructions:

- **Scroll speed**: Controls how quickly the agent moves through pages (affects time-on-page metrics)
- **Reading speed**: How long the agent "dwells" on text content before acting
- **Click accuracy**: For motor impairment personas, clicks include Gaussian noise offset
- **Session budget**: Agent stops trying after X minutes (impatient users give up faster)
- **Tab/keyboard usage**: Forces keyboard-only navigation for motor impairment personas
- **Cognitive load threshold**: Agent flags pages where information density exceeds persona's threshold

### Agent Loop Pseudocode

```typescript
async function runPersonaAgent(persona: Persona, project: Project, goals: string[]) {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: persona.deviceProfile.screenSize,
    locale: persona.language,
    timezoneId: persona.timezone,
  });
  const page = await context.newPage();

  // Apply CDP constraints
  await applyPersonaConstraints(page, persona);

  // Run axe-core baseline
  const axeResults = await runAxeCore(page);
  await saveFindings(axeResults, persona);

  // Agent loop
  const agent = createPersonaAgent(persona, goals);
  let stepCount = 0;
  const maxSteps = 50;
  const startTime = Date.now();

  while (stepCount < maxSteps && !agent.isGoalComplete()) {
    // Budget check
    if (Date.now() - startTime > persona.sessionBudgetMinutes * 60_000) {
      await saveFinding({ type: 'abandonment', reason: 'session_budget_exceeded' });
      break;
    }

    // Fast loop: get state → decide → act
    const snapshot = await page.accessibility.snapshot();
    const action = await agent.decideAction(snapshot);
    const result = await executeAction(page, action, persona);

    // Per-step checks
    await runPerStepChecks(page, persona);  // focus visible, target size, contrast
    await saveStepEvidence(page, stepCount);

    // Slow loop: reflect every 5 steps
    if (stepCount % 5 === 0) {
      const reflection = await agent.reflect();
      if (reflection.shouldChangeStrategy) {
        agent.updateStrategy(reflection.newApproach);
      }
    }

    stepCount++;
  }

  // Session summary
  await generatePersonaSummary(persona, agent.getHistory());
}
```

### Persona Simulation Quality

Research findings on LLM persona accuracy:
- Stanford's Generative Agents: 85% of human test-retest reliability for survey responses
- OCEAN/Big Five traits align well in instruction-tuned models (Cohen's d of 5.47 for Extraversion in GPT-4)
- **Critical limitation**: LLMs are better at *navigational behavior diversity* than *authentic preference simulation*. Personas will explore differently but may not truly "feel" frustrated.
- **Mitigation**: Use behavioral signals (time-on-task, step count, backtracking) as frustration proxies rather than relying on LLM self-reported emotions.
- **Consistency decay**: Off-the-shelf LLMs drift from assigned personas over multi-turn interactions. Mitigate with strong system prompts and periodic persona reinforcement in the agent loop.

---

## 4. Persona System {#persona-system}

### Type System

```typescript
interface Persona {
  id: string;

  // Identity
  name: string;
  age: number;
  location: string;
  language: string;
  occupation: string;
  bio: string;  // One-line persona summary

  // Capabilities
  techProficiency: 1 | 2 | 3 | 4 | 5;
  accessibilityNeeds: AccessibilityProfile[];
  deviceProfile: DeviceProfile;

  // Context
  role: "new-user" | "power-user" | "admin" | "support-agent" | "developer" | string;
  goals: string[];          // "Find pricing", "Cancel subscription"
  frustrations: string[];   // "Hates popups", "Low patience for loading"

  // Constraints
  sessionBudgetMinutes: number;  // How long they'll try before giving up
  cognitiveLoad: "low" | "medium" | "high";

  // Behavioral modifiers
  scrollSpeed: "slow" | "normal" | "fast";
  readingSpeed: "slow" | "normal" | "fast";
  clickAccuracy: "low" | "medium" | "high";
  usesKeyboardNav: boolean;

  // Generated
  systemPrompt: string;     // LLM system prompt (auto-generated from above fields)
}

interface DeviceProfile {
  type: "desktop" | "tablet" | "mobile";
  os: string;
  browser: "chromium" | "firefox" | "webkit";
  screenSize: { width: number; height: number };
  connection: "4g" | "3g" | "slow-3g" | "offline";
  cpuThrottleRate: number;  // 1 = normal, 4 = quarter speed
}

type AccessibilityProfile =
  | { type: "vision"; variant: VisionVariant; cdpType?: string }
  | { type: "motor"; variant: MotorVariant }
  | { type: "cognitive"; variant: CognitiveVariant }
  | { type: "hearing"; variant: HearingVariant };

type VisionVariant =
  | "low-vision"           // blurredVision CDP
  | "colorblind-deutan"    // deuteranopia CDP
  | "colorblind-protan"    // protanopia CDP
  | "colorblind-tritan"    // tritanopia CDP
  | "achromatopsia"        // achromatopsia CDP
  | "cataracts"            // custom SVG filter (blur + yellowing)
  | "macular-degeneration" // custom SVG filter (central vision loss)

type MotorVariant =
  | "keyboard-only"        // force keyboard nav, no mouse
  | "switch"               // sequential focus navigation
  | "tremor"               // Gaussian jitter on clicks
  | "one-handed"           // limited reach areas

type CognitiveVariant =
  | "dyslexia"             // reading difficulty
  | "adhd"                 // low attention span, distraction sensitivity
  | "memory"               // short-term memory limitations
  | "low-literacy"         // reading level < grade 6

type HearingVariant =
  | "deaf"                 // no audio, needs captions/transcripts
  | "hard-of-hearing"      // reduced audio, prefers visual
```

### Persona Auto-Generation

Three generation modes:

**From URL** (crawl + infer):
1. Crawl site with Playwright (max 20 pages)
2. Extract: page titles, nav structure, content topics, form types, language, auth presence
3. Feed to Claude: "Based on this site structure, generate 4-8 diverse personas who would use this site. Include at least one accessibility persona."

**From Codebase** (analyze + infer):
1. Clone repo, parse file tree
2. Extract: route structure, auth roles, i18n locales, ARIA usage, feature flags, user model fields
3. Feed to Claude: "Based on this codebase structure, generate personas matching the user types this app was built for."

**From Description** (text prompt):
1. User provides: "B2B SaaS project management tool for teams of 10-50"
2. Claude generates 4-8 personas with diversity across tech proficiency, role, accessibility needs, device usage

### Starter Templates

Pre-built persona sets users can start from:

| Template | Personas Included |
|----------|------------------|
| **E-commerce** | First-time shopper, Return customer, Mobile browser, Screen reader user, International buyer, Deal hunter |
| **SaaS** | Free trial user, Power user, Admin, Non-technical team member, Accessibility user, Developer/API user |
| **Content site** | Casual reader, Researcher, Mobile commuter, Low-vision reader, Non-native speaker, RSS/feed user |
| **Government** | Citizen (low-tech), Government employee, Elderly user, Screen reader user, Non-English speaker, Rural/low-bandwidth |
| **Developer tool** | Senior engineer, Junior dev (first time), Non-native English speaker, Accessibility-focused dev, Mobile reviewer |

---

## 5. Accessibility Simulation Suite {#accessibility-simulation}

### Layer Architecture

Seven layers, from automated to AI-evaluated:

**Layer 1: Automated WCAG Checks (axe-core + IBM Equal Access)**
- axe-core detects ~57% of WCAG issues automatically
- IBM Equal Access extends coverage with additional ACT rules
- Run via `@axe-core/playwright` integration
- Catches: missing alt text, color contrast failures, duplicate IDs, form label associations, ARIA misuse, heading structure

**Layer 2: Vision Simulation (CDP Protocol)**
- Color blindness: `Emulation.setEmulatedVisionDeficiency` — protanopia, deuteranopia, tritanopia, achromatopsia, blurredVision
- Cataracts: Custom SVG filter (blur + yellowing + glare)
- Macular degeneration: Custom SVG filter (central vision loss via radial gradient mask)
- Screenshots taken AFTER filter application as evidence
- LLM evaluates: "Can this persona read this content? Can they distinguish these UI elements?"

**Layer 3: Screen Reader Proxy (Accessibility Tree Traversal)**
- Full accessibility tree via `page.accessibility.snapshot()`
- Evaluate: Are all interactive elements labeled? Is heading hierarchy logical? Are live regions announced? Is reading order sensible?
- Cannot fully replicate NVDA/VoiceOver/JAWS differences, but covers 80%+ of common issues
- For deeper AT testing, integrate Guidepup's `virtual-screen-reader` for unit-level checks

**Layer 4: Motor Impairment Testing**
- **Keyboard-only navigation**: Automated Tab/Shift+Tab sequences, track `document.activeElement` at each step
- **Focus trap detection**: Tab repeatedly within components, flag if focus never escapes
- **Touch target size**: Measure `getBoundingClientRect()` for all interactive elements. WCAG 2.5.8 (AA) = 24x24px minimum; 2.5.5 (AAA) = 44x44px
- **Tremor simulation**: Gaussian noise offset on click coordinates (configurable sigma)
- **Skip navigation**: Detect presence and functionality of skip links

**Layer 5: Cognitive Accessibility**
- **Reading level**: Flesch-Kincaid Grade Level via `text-readability` npm package. Target: grade 7-9 for general, grade 5-6 for cognitive disability personas
- **Information density**: Words per section, interactive elements per viewport, nav choices per level, form fields per step
- **Plain language check**: Sentence length, passive voice, jargon detection
- **COGA guidelines evaluation**: 8 design goals from W3C Cognitive Accessibility Task Force
- **Decision fatigue**: Count of choices presented before primary action path

**Layer 6: Environment Simulation (CDP)**
- Network throttling presets: 4G, 3G, slow 3G, offline
- CPU throttling: `Emulation.setCPUThrottlingRate` (rate multiplier)
- Viewport/device emulation: Playwright device presets (iPhone, Pixel, iPad, etc.)

**Layer 7: LLM Persona Evaluation (Subjective)**
- After all automated checks, feed the page state + findings to LLM with persona prompt
- LLM adds subjective evaluation: "As this persona, is this error message helpful? Is the CTA obvious? Would I feel confident completing this form?"
- This catches issues automated tools miss: confusing microcopy, intimidating UI, unclear next steps

### Accessibility Scoring Per Persona

```typescript
interface PersonaAccessibilityScore {
  overall: number;         // 0-100 weighted composite
  categories: {
    vision: number;        // Contrast, color independence, text sizing
    motor: number;         // Keyboard nav, target sizes, focus management
    cognitive: number;     // Reading level, info density, error clarity
    hearing: number;       // Captions, transcripts, visual alternatives
  };
  wcagCriteria: {
    criterion: string;     // e.g., "1.4.3 Contrast (Minimum)"
    level: "A" | "AA" | "AAA";
    status: "pass" | "fail" | "needs-review";
    personaImpact: "critical" | "serious" | "moderate" | "minor";
  }[];
}
```

Scoring approach: Map each persona to relevant WCAG criteria subsets, weighted by impact for that persona's specific conditions.

---

## 6. Codebase Analysis Engine {#codebase-analysis}

### What Gets Extracted

| Signal | How | Persona Relevance |
|--------|-----|------------------|
| Route/page structure | File tree traversal (App Router conventions) | User journey mapping for all personas |
| Auth roles & middleware | AST: detect `auth()`, `getSession()`, role checks, RLS policies | Role-based personas (admin, guest, subscriber) |
| i18n setup | Detect `next-intl`, `react-i18next`, locale files | Language personas. Missing translations per locale |
| ARIA attributes | AST: scan for `aria-label`, `role`, `aria-live`, semantic HTML | Accessibility personas |
| Error messages | AST: extract strings in `throw`, `toast.error()`, validation schemas | All personas — are messages helpful for this persona's tech level? |
| Form validation | Zod/Yup schemas, HTML5 attributes | UX quality per persona |
| Feature flags | Detect LaunchDarkly, Statsig, PostHog, `if (featureEnabled())` | A/B variant persona testing |
| Component complexity | Prop count, nesting depth, conditional branches | Cognitive load proxy |
| Design system usage | Count `<Button>` vs raw `<button>`, hardcoded colors vs tokens | Consistency affects all personas |
| Bundle size indicators | Dynamic imports, heavy dependencies, image optimization | Performance personas (slow device/connection) |

### Analysis Pipeline

```
1. Clone/receive repo
   └→ Parse file tree, detect framework (Next.js, Laravel, etc.)

2. Static extraction (AST)
   ├→ tree-sitter (multi-language: JS, TS, Python, PHP)
   ├→ @typescript-eslint/parser (TS/React specific)
   ├→ eslint-plugin-jsx-a11y rules (React a11y)
   └→ postcss (CSS analysis: colors, media queries, spacing)

3. Automated checks
   ├→ axe-core on rendered components (if possible)
   ├→ Color contrast computation from extracted color pairings
   ├→ Reading level analysis on extracted string content
   ├→ Component complexity scoring
   └→ Design system consistency audit

4. LLM persona review
   ├→ Chunk code by persona-relevant slice (not whole codebase)
   │   - Auth middleware → role-based persona review
   │   - Form components → UX persona review
   │   - Error handlers → all personas (clarity per tech level)
   │   - Nav components → accessibility persona review
   └→ System prompt: "As [persona], review this code for usability issues"
```

### Chunking Strategy for LLM

Don't feed the whole codebase. Feed persona-relevant slices:

| Persona Type | Code Slice |
|-------------|-----------|
| Screen reader user | All components with interactive elements, nav, forms |
| Junior developer | README, getting-started docs, API examples, error messages |
| Admin user | Auth middleware, role checks, admin routes, permission logic |
| International user | i18n config, locale files, date/currency formatting |
| Mobile user | Responsive breakpoints, touch handlers, viewport-dependent logic |
| Performance persona | Bundle config, image handling, lazy loading, API response shapes |

---

## 7. Results & Dashboard UX {#results-dashboard}

### Design Principles

Based on research into Cypress Cloud, Datadog Synthetics, PostHog, Linear, Dovetail, and Percy:

1. **Linear-inspired aesthetic**: Dark mode default, LCH color space for perceptual uniformity, warm grays, three-variable theming (base, accent, contrast)
2. **Card-based KPI strip** at top (from Vercel Analytics pattern): 4-6 key metrics always visible
3. **Tag-based insight clustering** (from Dovetail): Every finding traceable to source evidence
4. **Percy-style three-panel comparison** for before/after regression diffs
5. **Progressive disclosure**: Start simple, reveal complexity on demand

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  MultiPersonas   [Project ▼]   [← Run #41]  [Run #42]  [#43 →]│
├──────────┬──────────────────────────────────────┬───────────────┤
│          │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │               │
│ PERSONAS │ │ 87 │ │ 12 │ │ 4  │ │ 3m │ │ 72%│ │  ISSUES (12)  │
│          │ │Score│ │Iss.│ │P0s │ │Avg │ │Pass│ │               │
│ ● Rosa   │ └────┘ └────┘ └────┘ └────┘ └────┘ │  ▼ Critical(4)│
│   72/100 │                                      │  ⬤ Missing alt│
│ ● Marcus │ [By Persona] [By Page] [Conflicts]  │    → /checkout│
│   91/100 │                                      │    Rosa,Aisha │
│ ○ Aisha  │ ┌──────────────────────────────────┐│  ⬤ No kbd nav │
│   45/100 │ │                                  ││    → /signup  │
│ ● Dev Jr │ │    ACTIVE VIEW CONTENT           ││    Aisha      │
│   88/100 │ │                                  ││               │
│          │ │    Persona×Page Matrix            ││  ▼ Serious (5)│
│ [+ Add]  │ │    Session Replay                 ││  ⬤ Low contras│
│ [Auto ✨]│ │    Page Detail                    ││  ⬤ Tiny target│
│          │ │    Conflict Analysis              ││  ...          │
│          │ │                                  ││               │
│          │ └──────────────────────────────────┘│  [Severity ▼] │
│          │                                      │  [Category ▼] │
│          │                                      │  [Persona ▼]  │
├──────────┴──────────────────────────────────────┴───────────────┤
│ [▶ Run Test]  Last run: 2m ago  ● 12 issues  ● 4 personas      │
└─────────────────────────────────────────────────────────────────┘
```

### Four Result Views

**1. By Persona** — Persona cards with scores, expandable to session replay
```
┌─────────────────────────────────────────────────────────┐
│ Rosa (72, low vision, retired teacher)          72/100  │
│ ████████████████████░░░░░░░░                           │
│ Tasks: 3/5 complete  |  Time: 4m12s  |  Issues: 3 P0  │
│ [View Session ▶]  [View Issues]                         │
│                                                         │
│ Journey: /home ✓ → /pricing ✓ → /signup ✗ (abandoned)  │
│ Emotion: 😐 → 😊 → 😤                                  │
└─────────────────────────────────────────────────────────┘
```

**2. By Page** — Which personas succeed/fail on each route
```
/checkout
├── Rosa (low vision):    ✗ Failed — form labels not visible with blur filter
├── Marcus (power user):  ✓ Passed — completed in 45s
├── Aisha (keyboard-only):✗ Failed — payment form not keyboard accessible
└── Dev Jr (junior dev):  ✓ Passed — clear flow
```

**3. Conflicts** — Persona × Page matrix heatmap
- Rows = personas, columns = pages
- Cells colored red/yellow/green by score
- Click cell → drill into specific persona+page detail
- Conflict highlights: red border on cells where two personas have opposite outcomes

**4. Session Replay** — Video-style scrubber with event markers
- Synchronized event log sidebar
- Screenshot per step with action overlay
- Accessibility tree state at each step
- Findings pinned to the step where they occurred

### Visualizations

| Chart | Library | Purpose |
|-------|---------|---------|
| KPI metric cards | shadcn Card | Top-level scores |
| Persona × Page heatmap | Nivo HeatMap | Conflict detection matrix |
| Journey timelines | Recharts (via shadcn Chart) | Per-persona page flow with dwell time |
| Regression sparklines | Recharts | Score trends across deploys |
| Accessibility radar | Nivo Radar | WCAG category coverage per persona |
| Issue severity breakdown | Recharts PieChart | P0/P1/P2/P3 distribution |

### Real-Time Streaming UX

During test runs:
- Segmented progress bar: one segment per persona, color-coded (green/red/gray/animated)
- Results cards appear with `AnimatePresence` (Motion library) as findings stream in
- ETA based on pages remaining × avg time per page
- Can watch any persona's session live (screenshot stream)

### Onboarding Flow

**Target: URL input to first results in < 60 seconds**

1. Sign up (Supabase Auth — email or GitHub OAuth)
2. Land on empty dashboard with demo data pre-loaded
3. CTA: "Test your first site" → single URL input
4. AI auto-generates 4 personas (with loading animation showing persona "profiles appearing")
5. User reviews personas (can edit/add/remove) → "Run Test"
6. Live progress view = the onboarding. User learns what the tool does by watching it work.
7. Results appear incrementally. First value in ~60s.

Persona creation uses **conversational input, not forms**: "Describe who uses your site" → AI generates structured personas → user refines.

---

## 8. CI/CD & Developer Workflow {#cicd}

### GitHub Action

```yaml
# .github/workflows/persona-test.yml
name: Persona Tests
on:
  deployment_status:  # Triggers after Vercel/Netlify deploy
    types: [completed]

jobs:
  persona-test:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: multipersonas/test-action@v1
        with:
          url: ${{ github.event.deployment_status.target_url }}
          suite: smoke  # or 'full'
          token: ${{ secrets.MULTIPERSONAS_TOKEN }}
```

**PR Comment Format** (update-in-place, not duplicate):

```markdown
## 🎭 Persona Test Results — Run #142

| Persona | Score | Δ | Status |
|---------|-------|---|--------|
| First-time visitor | 92 | +2 | ✅ Pass |
| Screen reader user | 78 | -5 | ⚠️ Regressed |
| Mobile (slow 3G) | 61 | — | ❌ Below threshold |
| Power user | 95 | +1 | ✅ Pass |

**3 new issues** | **1 regression** | [View full report →](https://app.multipersonas.dev/run/142)

<details><summary>New issues</summary>

- **P0** `/checkout` — Payment form missing keyboard focus indicators (affects: Screen reader user, Keyboard-only user)
- **P1** `/pricing` — Comparison table not responsive below 375px (affects: Mobile user)
- **P2** `/home` — Hero image missing alt text (affects: Screen reader user)

</details>
```

### CLI Tool

```bash
# Install
pnpm add -D multipersonas

# Or run without install
npx multipersonas test

# Commands
mpersonas init              # Scaffold multipersonas.config.ts
mpersonas login             # Browser-based OAuth
mpersonas run [suite]       # Execute tests (local or cloud)
mpersonas run --watch       # Re-run on file changes
mpersonas run --local       # Test against localhost (auto-tunnel)
mpersonas list              # Show configured personas/routes
mpersonas results [run-id]  # View results in terminal
mpersonas whoami            # Show auth status
mpersonas link              # Connect to cloud project
```

### Config File

```typescript
// multipersonas.config.ts
import { defineConfig } from 'multipersonas';

export default defineConfig({
  baseUrl: process.env.DEPLOY_URL || 'http://localhost:3000',

  personas: ['first-time-visitor', 'screen-reader-user', 'power-user'],

  suites: {
    smoke: {
      personas: ['first-time-visitor'],
      routes: ['/'],
      maxDuration: '2m',
    },
    full: {
      personas: 'all',
      routes: ['/', '/pricing', '/dashboard', '/checkout'],
      maxDuration: '15m',
    },
  },

  routes: {
    '/dashboard': { auth: true, personas: ['power-user', 'admin'] },
    '/': { personas: 'all' },
    '/checkout': { personas: 'all', goals: ['Complete purchase'] },
  },

  thresholds: {
    minScore: 60,            // Fail if any persona scores below 60
    failOnRegression: true,  // Fail if score drops from baseline
    failOnP0: true,          // Fail on any P0 finding
  },

  environments: {
    preview: { suite: 'smoke' },
    production: { suite: 'full' },
  },

  notifications: {
    slack: process.env.SLACK_WEBHOOK_URL,
    failuresOnly: true,
  },
});
```

### Deployment Preview Integration

Auto-detect preview URL from:
- **Vercel**: `repository_dispatch` event with preview URL, or poll Vercel API
- **Netlify**: `deploy-preview-{PR#}--{site}.netlify.app` convention
- **Railway**: Preview environments via Railway API
- **Manual**: Accept `url` input in GitHub Action

### Caching & Performance

- Hash page content + persona config → skip re-testing unchanged combinations
- Store baselines in cloud for cross-machine comparison (like Turborepo remote cache)
- Matrix strategy: shard personas across parallel GitHub Actions jobs
- `--local` mode for fast iteration during development

---

## 9. Tech Stack (Final) {#tech-stack}

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 15 App Router + shadcn/ui + Tailwind | Your stack. Server Components default. Dark mode with LCH theming |
| **Charts** | Recharts (via shadcn Chart) + Nivo (heatmap/radar) | Recharts for standard charts, Nivo for matrix/radar. Both SSR-compatible |
| **Animation** | Motion (Framer Motion v12+) | `AnimatePresence` for streaming results, `layout` for reordering |
| **AI** | Vercel AI SDK v6 + Claude Sonnet 4.6 (primary) + Claude Opus 4.6 (reports) | Unified multi-model API, structured output with Zod, multi-step tool calling, model routing |
| **Browser engine** | Playwright (Chromium + Firefox + WebKit) | Multi-browser, accessibility tree API, CDP access, best ecosystem |
| **Browser hosting** | Railway Docker (start) → Browserbase (scale) | Railway: official Playwright guide, simple. Browserbase: 50M+ sessions, managed |
| **Accessibility** | axe-core + IBM Equal Access + CDP vision simulation + Guidepup virtual-screen-reader | Most comprehensive: automated WCAG + real condition simulation |
| **Codebase analysis** | tree-sitter + @typescript-eslint + eslint-plugin-jsx-a11y + postcss + axe-core + LLM | Multi-language AST + React a11y lint + CSS analysis + LLM persona review |
| **Text analysis** | text-readability (Flesch-Kincaid) + retext (sentence analysis) | Cognitive accessibility: reading level + plain language checking |
| **Database** | Supabase Postgres + Drizzle ORM | Auth + DB + Storage + Realtime. Drizzle: lighter than Prisma, type-safe, no codegen |
| **Job queue** | Trigger.dev v3 | No timeout limits (critical for 5-30min browser sessions), TypeScript-native, built-in dashboard |
| **Hosting (web)** | Vercel | Best DX for Next.js, preview deploys, edge functions |
| **Hosting (workers)** | Railway or Trigger.dev Cloud | Persistent Docker containers for Playwright |
| **Storage** | Supabase Storage | Screenshots, session recordings, report PDFs |
| **Auth** | Supabase Auth (email + GitHub OAuth) | Built-in, handles team/org later |
| **Realtime** | Supabase Realtime | Live test progress streaming, no extra infra |

---

## 10. Database Schema {#database-schema}

```sql
-- Users (Supabase Auth handles core auth, this extends it)
profiles
  id (uuid, references auth.users),
  display_name (text),
  avatar_url (text),
  plan (enum: free|pro|team|enterprise),
  stripe_customer_id (text),
  created_at, updated_at

-- Persona definitions (reusable across projects)
personas
  id (uuid), user_id (uuid, fk profiles),
  name (text), bio (text),
  age (int), location (text), language (text), occupation (text),
  tech_proficiency (int, 1-5),
  accessibility_needs (jsonb),  -- AccessibilityProfile[]
  device_profile (jsonb),       -- DeviceProfile
  role (text),
  goals (jsonb),                -- string[]
  frustrations (jsonb),         -- string[]
  behavioral_modifiers (jsonb), -- scroll/read speed, click accuracy, etc.
  cognitive_load (text),        -- low|medium|high
  session_budget_minutes (int),
  system_prompt (text),         -- auto-generated LLM prompt
  is_template (bool default false),
  template_category (text),     -- e-commerce|saas|content|government|devtool
  created_at, updated_at

-- Projects (website or codebase target)
projects
  id (uuid), user_id (uuid, fk profiles),
  name (text),
  type (enum: website|codebase|both),
  url (text),                   -- for website testing
  repo_url (text),              -- for codebase analysis
  config (jsonb),               -- project-specific settings
  created_at, updated_at

-- Persona sets (groups of personas for a project)
persona_sets
  id (uuid), user_id (uuid, fk profiles),
  name (text), description (text),
  created_at

persona_set_members
  persona_set_id (uuid, fk persona_sets),
  persona_id (uuid, fk personas),
  primary key (persona_set_id, persona_id)

-- Test runs
test_runs
  id (uuid), project_id (uuid, fk projects),
  persona_set_id (uuid, fk persona_sets),
  status (enum: pending|running|completed|failed|cancelled),
  suite (text),                 -- smoke|full|custom
  trigger (enum: manual|ci|scheduled),
  config (jsonb),               -- routes, goals, thresholds
  overall_score (float),
  total_findings (int),
  git_ref (text),               -- commit SHA for CI runs
  pr_number (int),              -- PR number for CI runs
  base_run_id (uuid),           -- previous run for regression comparison
  started_at, completed_at, created_at

-- Per-persona test execution within a run
test_run_personas
  id (uuid),
  test_run_id (uuid, fk test_runs),
  persona_id (uuid, fk personas),
  status (enum: pending|running|completed|failed),
  score (float),                -- 0-100 composite
  task_success_rate (float),    -- % of goals completed
  time_to_complete_seconds (int),
  steps_taken (int),
  pages_visited (int),
  accessibility_score (jsonb),  -- PersonaAccessibilityScore
  emotional_journey (jsonb),    -- [{page, confidence, frustration}]
  session_summary (text),       -- AI-generated summary
  started_at, completed_at

-- Individual test steps (for session replay)
test_steps
  id (uuid),
  test_run_persona_id (uuid, fk test_run_personas),
  step_number (int),
  action_type (text),           -- click|type|scroll|navigate|observe
  action_detail (jsonb),        -- {selector, value, url, etc.}
  page_url (text),
  screenshot_url (text),        -- Supabase Storage URL
  accessibility_snapshot (jsonb), -- page.accessibility.snapshot()
  duration_ms (int),
  created_at

-- Individual findings
findings
  id (uuid),
  test_run_persona_id (uuid, fk test_run_personas),
  test_step_id (uuid, fk test_steps, nullable),
  severity (enum: P0|P1|P2|P3),
  category (enum: accessibility|usability|ux|performance|i18n|security|cognitive),
  subcategory (text),           -- e.g., "color-contrast", "keyboard-nav", "reading-level"
  page_url (text),
  element_selector (text),
  wcag_criterion (text),        -- e.g., "1.4.3" if applicable
  title (text),                 -- short description
  description (text),           -- detailed explanation
  recommendation (text),        -- suggested fix
  screenshot_url (text),
  evidence (jsonb),             -- raw data supporting this finding
  created_at

-- Persona conflicts (detected during report generation)
persona_conflicts
  id (uuid),
  test_run_id (uuid, fk test_runs),
  page_url (text),
  persona_a_id (uuid, fk personas),
  persona_b_id (uuid, fk personas),
  conflict_type (text),         -- e.g., "simplification_vs_power"
  description (text),
  suggestion (text),            -- how to resolve
  created_at

-- Generated reports
reports
  id (uuid),
  test_run_id (uuid, fk test_runs),
  summary (text),               -- executive summary
  persona_scores (jsonb),       -- {personaId: score}
  top_issues (jsonb),           -- prioritized issue list
  conflicts (jsonb),            -- conflict analysis
  recommendations (jsonb),      -- actionable next steps
  pdf_url (text),               -- generated PDF report
  generated_at

-- Baselines (for regression detection)
baselines
  id (uuid),
  project_id (uuid, fk projects),
  persona_id (uuid, fk personas),
  page_url (text),
  score (float),
  content_hash (text),          -- for cache invalidation
  test_run_id (uuid, fk test_runs),
  created_at

-- Indexes
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_category ON findings(category);
CREATE INDEX idx_findings_page ON findings(page_url);
CREATE INDEX idx_test_runs_project ON test_runs(project_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_baselines_lookup ON baselines(project_id, persona_id, page_url);
```

---

## 11. Pricing & Monetization {#pricing}

### Cost Structure Per Persona-Run (10-page site) — CORRECTED

| Cost Component | Optimistic | Realistic |
|---------------|-----------|-----------|
| LLM tokens (agent loop, 15-30 steps/page) | $1.08 | $1.80 |
| Retries + failed navigations (20-30% overhead) | — | $0.30 |
| Vision tokens (scoped screenshots) | $0.05 | $0.15 |
| Report generation (Opus synthesis) | $0.10 | $0.20 |
| Playwright browser time (~5 min) | $0.05 | $0.05 |
| Screenshot storage | $0.01 | $0.01 |
| **Total COGS per persona-run** | **~$1.30** | **~$2.50** |

Model routing (Haiku for navigation, Sonnet for evaluation) can reduce to ~$0.80-1.20/run at best. Not $0.50.

### Pricing Tiers (CORRECTED)

| Tier | Price | Includes | Max COGS at full usage |
|------|-------|---------|----------------------|
| **Free** | $0 | 3 personas, 10 runs/mo, 1 project, 7-day retention | $25/mo (manageable) |
| **Pro** | $79/mo | 10 personas, 150 runs/mo, 5 projects, 30-day retention, CI/CD | $225/mo (65% margin) |
| **Team** | $199/mo | Unlimited personas, 500 runs/mo, unlimited projects, 90-day retention, SSO | $750/mo (requires avg usage <250 runs) |
| **Enterprise** | Custom ($500+/mo) | Everything + SLA, VPAT evidence, compliance, dedicated support | Negotiated |

Overage: $0.15/run beyond plan limit (credit packs: 100 runs for $12).

### Value Metric

**Per persona-test-run** — charge when a persona actually tests. Aligns cost with value. Users control spend by choosing how many personas and how often.

### Open Source Strategy

Keep orchestration proprietary (it contains LLM costs that would be bypassed if self-hosted). Open source: CLI, GitHub Action, reporter plugins, persona template library.

---

## 12. Security & Auth Model {#security}

### Multi-Tenant Data Isolation

**RLS with `org_id` on every tenant-scoped table.** Supabase-recommended pattern.

- Every table gets `org_id` column with FK to `organizations`
- RLS policies use `auth.jwt() ->> 'org_id'` or membership lookup
- Embed `org_id` and `role` in JWT via Supabase custom claims (avoids DB round-trip per request)
- Create reusable `auth.org_id()` SQL function
- **Performance**: RLS adds ~1-2ms per query when using JWT claims directly. Index all `org_id` columns.

### Team/Org Permissions

```
organizations (id, name, slug, plan, stripe_customer_id)
org_members (org_id, user_id, role: owner|admin|member|viewer)
org_invitations (id, org_id, email, role, token, expires_at, invited_by)
```

**Roles:**
| Role | Billing | Members | Projects | Run Tests | View Results |
|------|---------|---------|----------|-----------|-------------|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | No | Yes | Yes | Yes | Yes |
| Member | No | No | Yes | Yes | Yes |
| Viewer | No | No | No | No | Yes |

**Invitation flow:** Generate signed token (crypto.randomUUID), store hash in `org_invitations`, send link via Resend. On accept, create membership, delete invitation. Expire after 7 days.

### API Key Management

**Format:** `mp_live_a1b2c3d4...` (prefix `mp_` + environment `live_`/`test_` + 32-byte random hex)

- Show full key exactly once at creation
- Store only SHA-256 hash + first 8 chars as `key_prefix`
- Scoped per org + project + environment
- Support key rotation with configurable grace period (default 24h overlap)

```sql
api_keys (id, org_id, project_id, name, key_prefix, key_hash, scopes[], environment, last_used_at, expires_at, created_by, revoked_at)
```

### Data Privacy

**Customer site data:**
- Screenshots, DOM snapshots, code snippets stored encrypted at rest (Supabase default AES-256)
- Auto-delete test artifacts after retention period (7/30/90 days per plan)
- "Purge project data" endpoint for GDPR deletion requests
- PII detection: blur form field content in screenshots where possible

**Auth credentials for testing authenticated pages:**
- Encrypt at rest with per-org key via Supabase Vault (`vault.secrets`)
- Never log credentials. Never return in API responses after creation.

**LLM data privacy:**
- Anthropic API does NOT train on API data (paid tier). 30-day retention for abuse monitoring.
- Communicate clearly in privacy policy with link to Anthropic's usage policy
- Enterprise tier: AWS Bedrock option (data stays in customer's AWS account)

**SOC 2 readiness from day one:**
- Audit logging: all API key creation/revocation, permission changes, data access
- Use Supabase `auth.audit_log`
- This is the hardest thing to retrofit later

### Rate Limiting

**Upstash Redis** (`@upstash/ratelimit`) with sliding window algorithm.

| Scope | Free | Pro | Enterprise |
|-------|------|-----|------------|
| API requests/min | 60 | 600 | Custom |
| Test runs/day | 10 | 500 | Unlimited |
| Concurrent tests | 1 | 5 | 20 |

Enforce in `middleware.ts`. Rate limit by API key hash (not IP — CI shares IPs). Return `429` with `Retry-After` header.

---

## 13. Multi-Tenant Architecture {#multi-tenant}

### Dual-Client Query Strategy

| Context | Client | RLS | Key |
|---------|--------|-----|-----|
| Client components, API routes serving user requests | `supabase.from()` | Enforced | `anon` key + user JWT |
| Server-side admin, migrations, Trigger.dev jobs | Drizzle via `postgres` driver | Bypassed | `service_role` key |

```typescript
// lib/db.ts — server-side Drizzle (bypasses RLS)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// CRITICAL: When bypassing RLS, ALWAYS scope manually
const orgProjects = await db.query.projects.findMany({
  where: eq(projects.orgId, currentOrgId),
});
```

### Organization Switching

URL-based: `/org/[slug]/projects` — bookmarkable, shareable, no stale state. Middleware validates membership server-side.

Personal workspace = org with one member. Same schema, no special cases (Linear/Vercel pattern).

### Resource Isolation Beyond DB

- **Storage**: Path-based isolation `{org_id}/{project_id}/{filename}` with RLS on `storage.objects`
- **API keys**: Belong to orgs, not users
- **Trigger.dev jobs**: `orgId` in job payload, service-role client with explicit scoping
- **Browser sessions**: Isolated contexts per persona, data stored under org path

### Usage Tracking & Billing

```sql
org_usage (org_id, period_start, run_count)
-- Increment atomically:
UPDATE org_usage SET run_count = run_count + 1
WHERE org_id = $1 AND period_start = $2;
```

Check limits in middleware before enqueuing test runs. Stripe per-org subscriptions with `metadata: { orgId }`. Usage-based billing via `stripe.subscriptionItems.createUsageRecord`.

---

## 14. Error Handling & Reliability {#reliability}

### Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|---------|
| Browser crash mid-test | `page.on('crash')`, `browserContext.on('close')` | Kill browser, launch fresh, replay from last checkpoint |
| LLM API timeout/rate limit | HTTP 429, timeout errors | Retry with exponential backoff (5 attempts, 1s-30s, jitter). Parse `Retry-After` |
| Network error during crawl | Playwright navigation timeout | Retry navigation 2-3x, then mark step failed and continue |
| Bot detection | Page blocks automation | Log detection, skip site, suggest `playwright-extra` stealth plugin |
| One persona fails | Child task error in Trigger.dev | Catch error, aggregate results from other personas, mark run as `partial` |

### Trigger.dev Reliability Patterns

```typescript
export const runPersonaTest = task({
  id: "run-persona-test",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 1800, // 30 min ceiling
  onFailure: async (payload, error) => {
    await db.testRunPersonas.update({
      where: { id: payload.testRunPersonaId },
      data: { status: "failed", error: error.message },
    });
  },
  run: async (payload) => {
    try {
      return await executePersonaTest(payload);
    } finally {
      await savePartialResults(payload.runId);
      await closeBrowser();
    }
  },
});
```

**Heartbeats for long jobs:**
```typescript
for (const page of pages) {
  await heartbeats.yield();
  metadata.set("progress", { page: page.url, persona: persona.name });
  await testPage(page);
}
```

**Idempotency:** Use `runId + personaId` as composite key with `ON CONFLICT DO NOTHING` for all DB writes.

### Timeout Budgets (Layered)

| Level | Timeout | Action on Expiry |
|-------|---------|-----------------|
| Per-action (click, type) | 10s | Retry once, then skip step |
| Per-step (multi-action flow) | 60s | Mark step failed, continue to next |
| Per-persona | configurable (default 5min) | Save partial results, mark persona timed out |
| Per-run | 30min hard limit (`maxDuration`) | Save all partial results, generate report with available data |

### Graceful Degradation

- axe-core check fails → log error, store `accessibilityResults: null`, continue. Navigation findings still valuable.
- LLM circuit breaker: after 5 consecutive failures in 60s, stop calling LLM and fail fast for remaining steps.
- Partial run results are always saved and surfaced. A run with 4/5 personas is more valuable than no data.

### Orphaned Run Detection

`heartbeat_at` timestamp column on `test_runs`. Updated via `metadata.set()`. Cron job marks runs as `timed_out` if `heartbeat_at > 35min old` and status still `running`.

---

## 15. Scaling Architecture {#scaling}

### Browser Session Capacity

| Setup | Concurrent Sessions | Memory | Cost |
|-------|-------------------|--------|------|
| Railway 8GB/4vCPU | 8-12 | ~500MB-1GB per session | ~$20-50/mo |
| Fly.io per-machine | 1-2 per machine, auto-scale | ~300ms cold start | ~$0.01/min/machine |
| Browserbase | Unlimited (managed) | Abstracted | ~$0.01-0.03/min/session |

**Recommendation:** Browserbase for production (offload hardest scaling problem). Fly.io as self-managed alternative.

**Pool management:** Fresh BrowserContext per persona (not fresh browser). Reusing single Browser instance with multiple contexts saves ~100MB per session.

### Queue Management

- One Trigger.dev task per persona-run (not per page)
- Global concurrency limit: 50 concurrent persona sessions
- Per-tenant limits: free=2, paid=10 concurrent personas
- Priority queues: paid queue polled 3x more frequently
- Backpressure signal: if queue depth > 3x concurrency limit, reject new runs with `retry-after` header
- Alert if p95 queue wait time > 60s

### LLM API Rate Management

**50 concurrent personas × ~2 calls/min = 100 RPM.** Need Claude Tier 2+ (1,000 RPM).

- Central token bucket (Redis-backed) shared across workers
- Multi-model fallback: Claude Sonnet → GPT-4o → Gemini Flash
- Circuit breaker: after 3 failures in 60s, route all traffic to fallback for 30s
- **Prompt caching**: Persona system prompts (~2K tokens) cached across page visits. Saves ~$0.05/persona-run. At 10K runs/mo = ~$500/mo savings.

### Database Scaling

- Supabase PgBouncer: 200 direct connections, effectively unlimited pooled
- 50 concurrent writers doing incremental inserts = well within capacity
- Batch findings: buffer 5-10 per persona, batch-insert every 30s
- JSONB fine up to ~100KB per document, millions of rows. GIN indexes on queried paths.
- Read replicas when dashboard queries cause write latency (~50+ concurrent dashboard users)

### Storage Scaling

**Volume estimate:** 10 screenshots × 10 pages × 5 personas × 100 runs/day = **50K screenshots/day** (~10 GB/day, ~300 GB/mo)

**Recommendation: Cloudflare R2** — free egress is killer for screenshot-heavy dashboards.

| | Supabase Storage | Cloudflare R2 | S3 |
|---|---|---|---|
| Storage/GB/mo | $0.021 | $0.015 | $0.023 |
| Egress | $0.09/GB | **Free** | $0.09/GB |
| 300 GB/mo | ~$33 | ~$4.50 | ~$34 |

**Retention:** Full-res screenshots 30 days → thumbnails → delete at 90 days. Lifecycle rules on bucket.

### Cost at Scale (1,000 runs/mo, 5 personas each)

| Component | Monthly |
|-----------|---------|
| LLM API (with caching) | $800-1,500 |
| Browserbase/Fly.io | $400-800 |
| Supabase Pro | $25 |
| Cloudflare R2 | $5-15 |
| Trigger.dev Pro | $50 |
| Railway (coordinator) | $20-50 |
| **Total** | **$1,300-2,440** |

LLM API = 60%+ of cost. Every optimization there has outsized impact.

---

## 16. Observability & Analytics {#observability}

### LLM Observability — Langfuse

Wrap all AI calls via Vercel AI SDK telemetry:

```typescript
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: personaPrompt,
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'persona-simulation',
    metadata: { userId, testRunId, personaId },
  },
});
```

**Dashboards to build:**
- Daily LLM spend with 7-day rolling average
- Cost per test run distribution (p50/p90/p99)
- Token usage by model (track if multi-model routing works)
- Latency distribution for agent loops (flag >30s)
- Quality score trends per persona type

### Product Analytics — PostHog

**Core funnel:** signup → project created → first test run → test with 3+ personas → CI/CD enabled → paid conversion

**Key events:**

| Event | Trigger |
|-------|---------|
| `user_signed_up` | Auth webhook |
| `test_run_started` | API route |
| `test_run_completed` | Trigger job completion |
| `persona_created` | API route |
| `issue_found` | Trigger job |
| `ci_cd_enabled` | API route |
| `subscription_started` | Stripe webhook |

### Error Tracking — Sentry

- `@sentry/nextjs` for web app (both server + client)
- Initialize Sentry at top of each Trigger.dev task
- Capture Playwright `page.on('pageerror')` and console errors (tag as `source: target-site`)
- Alert rules: page on unhandled exceptions, Slack on elevated error rate (>5x baseline in 15min)

### Infrastructure Monitoring

- Railway: built-in CPU/memory/disk metrics + alerts on memory >80%
- Supabase: dashboard for connection pool, query performance, storage
- Trigger.dev: queue depth, failure rate from API
- Uptime: Betterstack free tier (5 monitors: web app, API health, Supabase, Trigger.dev, synthetic smoke test)

### Business Metrics

PostHog for everything (skip Metabase until post-Series A):
- MRR, churn, LTV from Stripe webhook events
- Usage: runs/day, personas/project, pages/run
- Unit economics: LLM cost per run (from Langfuse API → PostHog custom event weekly)

### Implementation Order

1. **Week 1:** Langfuse on all LLM calls + Sentry on web + workers
2. **Week 2:** PostHog core funnel events + Betterstack uptime
3. **Week 3:** Langfuse cost dashboards + PostHog funnels
4. **Week 4:** Business metrics dashboard + alerting rules

All tools have generous free tiers. ~$0/mo at launch, ~$200/mo at 10K MAU.

---

## 17. Integrations & Exports {#integrations}

### Issue Tracker Integrations

| Tracker | Auth | API | Pattern |
|---------|------|-----|---------|
| GitHub Issues | GitHub App installation | REST `POST /repos/{owner}/{repo}/issues` | Easiest, do first |
| Linear | OAuth 2.0 with PKCE | GraphQL `issueMutation` | Clean API, dev-friendly |
| Jira | OAuth 2.0 (3-legged, Atlassian Connect) | REST v3 `POST /rest/api/3/issue` | Enterprise demand |
| Asana | OAuth 2.0 | REST `POST /tasks` | Lower priority |

**Per finding, create issue with:** Title (`[P0] Missing alt text - Screen reader user on /checkout`), description, screenshot attachment, persona details, page URL, WCAG criterion, reproduction steps, MultiPersonas finding ID for back-linking.

**Two-way sync:** Store `finding_id ↔ external_issue_key` mapping. Register webhooks on tracker. When issue closes, mark finding as `resolved-externally`, flag for re-verification on next run. Regression reopens it (Sentry pattern).

### Slack/Discord Integration

Beyond webhooks — use **Block Kit interactive messages**:
- Buttons: "Create Jira Issue," "Dismiss," "Snooze" directly in Slack
- Slash command: `/multipersonas run {suite}` triggers test, posts results
- Thread findings under summary message (Vercel/Railway pattern)
- Channel per project (`#mp-myapp`)

### Webhooks API

**Events:** `test.completed`, `finding.created`, `finding.resolved`, `score.regressed`, `project.updated`

**Stripe/GitHub-style implementation:**
- HMAC-SHA256 signature verification with timestamp (prevent replay)
- Retry: 3 attempts with exponential backoff (1min, 10min, 1hr)
- Management UI: list endpoints, delivery logs, test button, enable/disable
- Payload includes `id`, `type`, `created_at`, `data`, `project_id`

### Export Formats

| Format | Use Case | Priority |
|--------|----------|---------|
| **SARIF v2.1.0** | GitHub Code Scanning, VS Code, CI tools | P0 — highest leverage, puts findings in GitHub Security tab |
| **JUnit XML** | CI test result aggregation (Jenkins, GitLab, GH Actions) | P0 — enables native CI integration |
| **PDF report** | Stakeholder reporting, executive summary | P1 |
| **CSV/JSON** | Data export, custom analysis | P1 |
| **VPAT/ACR** | Enterprise procurement (government, large orgs require these) | P2 — enterprise differentiator |

### Figma Integration

- **Import**: Figma REST API → extract frames as images → persona analysis pre-build
- **Annotate**: Figma Plugin API → overlay finding markers on design frames
- Start with plugin (easier distribution), not full integration

### REST API

Core endpoints: `GET/POST /v1/projects`, `POST /v1/projects/{id}/runs`, `GET /v1/runs/{id}`, `GET /v1/runs/{id}/findings`, `GET /v1/export/{run_id}.{format}`

- URL-based versioning (`/v1/`)
- OpenAPI spec auto-generated via `zod-to-openapi`
- Rate limiting per API key (100 req/min standard, 1000 enterprise)

### Integration Priority Order

1. Webhooks API (foundation)
2. SARIF + JUnit export (CI value)
3. GitHub Issues (most users have it)
4. Slack interactive messages (drives adoption)
5. Linear/Jira (enterprise demand)
6. REST API + OpenAPI (third-party integrations)
7. PDF/CSV export (stakeholder reporting)
8. VPAT/ACR (enterprise sales)
9. Figma plugin (design workflow)

---

## 18. Persona Validation {#validation}

### Academic Validation Results

| Study | Method | Accuracy |
|-------|--------|----------|
| Stanford Generative Agents | 1,052 real interviews → AI replicas | 85% of human test-retest reliability |
| PersonaTester | Persona-conditioned vs baseline agents | 117-126% improvement in consistency/variability |
| SimAB | AI personas vs 47 historical A/B tests | 67% overall, 80%+ high-confidence |
| UXAgent | Expert evaluation of 60 agent sessions | Qualitative: "usable action traces and reasoning logs" |

### Building a Validation Pipeline

1. **Ground-truth corpus**: Collect 30+ sites with documented usability findings (academic UX papers publish freely). Run AI personas blind. Measure recall (% of known issues found) and precision (% of AI findings that are real).
2. **Benchmark sources**: WCAG test cases (W3C), WebAIM Million dataset, Baymard Institute 12K+ usability guidelines
3. **Target**: >70% recall on known issues. Track false positive rate separately.
4. **Re-validate quarterly** against new benchmarks and when LLM versions change.

### Persona Behavioral Fidelity

- PersonaTester proved personas genuinely change testing behavior (not just labels)
- SimAB proved removing persona conditioning drops accuracy by ~10 points
- **Drift mitigation**: Re-inject persona description at each decision point, not just session start. Use short task sequences (5-7 steps). Run same persona 20x to measure consistency.
- **Diversity measurement**: Intra-persona consistency (same persona, different runs = high) + inter-persona variability (different personas = distinct patterns)

### Confidence Scoring Per Finding

| Level | Criteria | Label |
|-------|---------|-------|
| High | Found by 3+ persona types OR matches known WCAG pattern | "Likely issue" |
| Medium | Found by 1-2 personas with clear reasoning | "Potential issue" |
| Low | Single persona, ambiguous reasoning | "Worth investigating" |

### Feedback Loop

- Thumbs up/down on each finding
- Track **confirmation rate** (% marked valid) — target >75%
- Track **finding-to-fix rate** (% leading to actual changes) — ultimate quality signal
- Aggregate dismissed findings by category → adjust persona sensitivity thresholds
- A/B test prompt variations against ground-truth corpus before deploying

### Public Credibility

- Position as "AI-assisted usability review" not "AI usability test"
- Run dual studies: AI personas + real users on same site, publish comparison
- Public audits of popular sites as content marketing + validation evidence
- The finding-to-fix rate becomes your public accuracy metric over time

---

## 19. Go-to-Market & Positioning {#gtm}

### Target Buyer

**Primary:** Frontend/QA Lead (discovers tool, champions internally)
**Budget approver:** Engineering Manager or VP Eng
**Secondary:** UX Researchers (currently do this manually), Product Managers (care about conversion)

### Positioning

**Core wedge:** "Automated testing checks if things work. We check if they make sense."

Competitors position as either QA tools (Checkly, Cypress) or research tools (Synthetic Users, Dovetail). We sit at the intersection: **the UX layer your CI pipeline is missing.**

**Tagline candidates:**
- "Test your UX the way real users break it"
- "Catch UX issues before your users do"
- "Persona-driven testing for every deploy"

### Landing Page Strategy

**Hero:** Let visitors **paste a URL and get a free mini-audit** (3 personas, 1 page). Zero signup friction. Demonstrates value in 30 seconds. (Vercel/Supabase "try before auth" pattern.)

**Structure:**
1. Hero: URL input + instant mini-report
2. Problem: "Lighthouse checks rules. We check experiences."
3. How it works: 3 steps (define personas → test pages → get findings)
4. Live sample report (real, not mockup)
5. Integration logos (GitHub Actions, CI/CD, frameworks)
6. Social proof
7. Pricing (free tier prominent)

### Go-to-Market Channels (Priority Order)

1. **Product Hunt** — Launch with free URL audit hook
2. **Hacker News Show HN** — Real audit of a well-known site
3. **GitHub Actions Marketplace** — Distribution, not just a feature
4. **Dev Twitter/X** — Thread showing persona findings on popular sites
5. **r/webdev, r/accessibility** — Show real results, not product announcements
6. **Newsletters:** Bytes, TLDR, Frontend Focus, A11y Weekly
7. **Conferences:** axe-con, CSUN (accessibility), React/Next.js conf

### Content Strategy

**High-traffic posts:**
- "We tested the top 10 e-commerce sites with AI personas — here's what we found"
- "Accessibility audit of [gov.uk / popular SaaS]" (accessibility community amplifies these)
- "Why Lighthouse 100 doesn't mean your site is usable"
- Framework-specific guides: "Testing your Next.js app with AI personas in CI"
- Comparison pages: "vs axe," "vs Lighthouse," "vs manual QA" (bottom-of-funnel SEO)

**Lead gen:**
- Open source persona template library (gets starred/forked, brings people back)
- Free URL audit tool (no signup needed)
- GitHub Action in marketplace

### Distribution Flywheel

```
npm CLI downloads → GitHub Action installs → free audits run
→ conversion to Pro (CI integration is the conversion trigger)
→ once in pipeline, very sticky
```

**Community:** GitHub Discussions (accessibility practitioners prefer searchable, async). Discord as secondary for power users.

**SEO targets:** "automated accessibility testing," "AI UX testing tool," "WCAG testing CI/CD," "accessibility testing GitHub Action"

---

## Honest Critique & Corrections {#critique}

### What The Plan Got Wrong

After brutal self-review, these are the real problems:

**1. COGS is underestimated.** Original: $1.15/run. Realistic: **$1.50-2.50/run** after retries, vision tokens, multi-step agent overhead, and Opus report generation. This changes unit economics significantly.

**2. Pro tier pricing is broken.** $49/mo for 500 runs at $1.50 real COGS = $750 in costs. We'd lose $700/mo on every active Pro user who maxes out. **Fix:** Pro = 150 runs at $79/mo. Or overage pricing at $0.15/run after limit.

**3. Free tier burns too much money.** 50 runs/mo × $1.50 = $75/mo per active free user. 200 active free users = $15K/mo in LLM costs before any revenue. **Fix:** Free = 3 personas, 10 runs/mo, 1 project.

**4. "60 seconds to first value" is fantasy.** Realistic: 3-5 minutes (signup + URL + persona generation + first agent run + first findings). 3-5 min is still great. Don't promise 60s and disappoint.

**5. Dual-process agent loop is over-engineered for MVP.** The "slow loop reflection every 5 steps" is from an academic paper. In practice, it's an extra LLM call that produces vague "I should try differently" outputs. **Fix:** Simple ReAct loop with retry-on-stuck heuristic. Add reflection later if agent quality metrics show aimless wandering.

**6. Plan-MCTS is academic fantasy.** Requires 3-5x LLM calls and browser time. COGS would hit $4-6/run. **Fix:** Move to "Future Research." Use simple ReAct with step budgets.

**7. Custom SVG vision filters are demo gimmicks.** Cataracts and macular degeneration filters won't be validated against real patient data. **Fix:** Keep CDP built-ins (protanopia, deuteranopia, etc.) and deterministic color contrast math. Cut custom filters.

**8. Codebase analysis is a distraction.** Nobody does it because the ROI is unclear. Subjective LLM opinions about code quality won't make someone pay $79/mo. **Fix:** Cut entirely from v1. Build only if customers ask post-launch.

**9. VPAT auto-generation will produce garbage.** Automated testing catches 30-40% of WCAG criteria. For the other 60%, the VPAT says "Not Evaluated" — useless for procurement. **Fix:** Position as "VPAT evidence package" that feeds into human review, not standalone deliverable.

**10. 26-week timeline is unrealistic.** Phase 3 alone has 12 bullet points = 6-8 weeks realistically. **Fix:** Completely revised timeline below.

**11. Competitive matrix is self-serving.** Marking "CI/CD: Yes" for an unbuilt feature is aspirational, not factual. **Fix:** Separate "Planned" from "Shipped" in the matrix.

**12. axe-core is the elephant in the room.** It's free, has millions of users, and integrates with every CI tool. Most of our accessibility findings will be identical to axe. **Fix:** Our differentiation is the persona layer ON TOP — persona-contextualized findings are worth paying for when raw axe findings are free. Must articulate this clearly.

**13. Anti-bot detection not addressed.** Cloudflare, DataDome, etc. will block Playwright on many real sites. This will be the #1 support issue. **Fix:** Add to Phase 0 testing. Use `playwright-extra` + stealth plugin. Document which sites work and which don't.

**14. Authenticated testing is complex.** Storing credentials, handling MFA, session state, account lockouts = 3-4 weeks of unbudgeted work. **Fix:** V1 = unauthenticated pages only. Auth testing is Phase 5+.

**15. LLM model versioning risk.** When Claude ships a new version, agent behavior may change completely. **Fix:** Pin model versions per customer. Prompt regression tests against ground-truth corpus before upgrading.

### Features That Sound Cool But Won't Drive Revenue

Cut from MVP. Build only if customers ask:
- Emotional journey mapping
- Cultural Hofstede dimensions
- Behavioral economics susceptibility profiles
- Competitor comparison testing
- Spoon theory energy budgets
- Cross-device journey testing
- B2B buying committee simulation
- Codebase analysis

The reason someone pays is: **"your CI pipeline now catches accessibility regressions before merge."** Not persona psychology theory.

---

## UX Design Improvements {#ux-improvements}

### Dashboard Design Language

- **Background:** `#0A0A0B` (near-black with warmth), not pure black. Warm neutrals, not cool blue-grays.
- **Sidebar recedes** — dimmer than main content, active view dominates.
- **One accent color** for active states/CTAs only. Everything else warm gray scale.
- **Command palette (Cmd+K) as primary navigation** — run tests, switch projects, jump to persona, filter issues. Table stakes for dev tools 2026.
- **AI findings as actionable cards on spatial canvas** (Cursor/v0 pattern), not chat messages. Each finding is draggable, dismissable, convertible to GitHub issue.

### Persona Profiles That Feel Alive

- **Avatars:** Stylized illustrations (DiceBear "adventurer" set), NOT AI-generated faces. Faces trigger uncanny valley + ethical concerns about representing demographics with synthetic faces.
- **Stat visualization:** Nivo radar chart per persona (5-6 axes: tech literacy, patience, visual acuity, motor precision, domain expertise). RPG character sheet pattern.
- **Signature color per persona** threaded through the UI — sidebar dot, heatmap row, session replay border.
- **Status line per run:** "Abandoned checkout after 3 failed tab attempts" > "Score: 45/100"

### Session Replay (Our Killer UX Differentiator)

- **Dual-pane replay:** Left = what persona "sees" (with simulated vision impairments applied). Right = actual page. Unique to persona-based testing. Immediately communicates value.
- **Thought bubbles:** Overlay AI-generated persona "thoughts" as speech bubbles during replay. "I can't find the submit button" pinned to the moment they hovered wrong.
- **Frustration signals:** Auto-detect rage clicks, dead clicks, hesitation (dwell >3s). Red dots on timeline scrubber.
- **Jump-to-finding:** Click any issue to jump replay to exact timestamp.

### Reports That Get Shared

- **Hero metric:** Single large circular gauge (0-100) like Lighthouse. Color red→amber→green. The thing people screenshot.
- **Persona strip:** 4-5 small persona avatars with individual circular scores below the hero.
- **Public report URLs** with Open Graph meta tags so Slack/Twitter unfurls show the score. Free marketing.
- **One-page summary:** Hero score, persona strip, top 5 findings, accessibility summary, "Run your own test" CTA.

### Our Own Accessibility

We're building an accessibility testing tool — our dashboard MUST be perfectly accessible:
- Three theme modes: Dark (default), Light, High Contrast
- All animations gated behind `prefers-reduced-motion`
- Every chart has `aria-label` text equivalent + tabular data alternative
- Full keyboard navigation. Cmd+K supports keyboard-first workflows.
- Run MultiPersonas against the MultiPersonas dashboard as meta-validation. Ship as case study.

---

## Validation Strategy (Do This FIRST) {#validation}

### The 2,166-Line Problem

This plan is a hypothesis document, not a roadmap. Every line is an assumption until validated. The risk is **plan attachment** — psychological resistance to pivoting when users tell us something different.

### Three Riskiest Assumptions

1. **Developers want persona-based feedback** (vs just accessibility scores)
2. **Teams will pay for this as standalone tool** (vs expecting it free/OSS)
3. **LLM persona narration is actionable** (vs feeling like noise)

### Validation Sequence (Before Building the Platform)

**Week 0-2: Build the CLI prototype**
- axe-core + LLM persona narration against a single URL
- 3 pre-built personas (first-time visitor, screen reader user, mobile user)
- Output: markdown report with findings, screenshots, persona commentary
- Post results on Twitter/HN. See if people run it on their own sites.

**Week 2-4: "Done for you" persona audits**
- Email 30 companies, offer free persona-based UX audit
- Deliver PDF showing how 5 personas experience their site
- The ones who ask "can we get this on every deploy?" are our customers
- **5 companies paying $500+ for an audit = validated pain point**

**Week 4-6: GitHub Action prototype**
- Thin Action that comments persona findings on PRs
- Even if engine is axe-core + LLM wrapper
- If developers configure it and LEAVE IT ENABLED, demand is validated

**Week 6+: Build the platform only after validation signals**

### Validation Metrics

| Signal | Threshold | Meaning |
|--------|-----------|---------|
| People run CLI on their own sites unprompted | 50+ runs in first week | Interest exists |
| Companies pay for manual audit | 5+ at $500+ | Pain point validated |
| GitHub Action stays enabled after 2 weeks | 10+ repos | Product validated |
| Sean Ellis test (survey first 20 users) | >40% "very disappointed" | PMF signal |
| $5K MRR from self-serve | Reached | Early PMF |

---

## 20. Implementation Phases (REVISED) {#implementation-phases}

### Phase 0: Validate (Weeks 1-4) — BEFORE BUILDING PLATFORM
- [ ] Build CLI prototype: axe-core + Playwright + LLM persona narration
- [ ] 3 pre-built personas (first-time visitor, screen reader user, mobile/slow connection)
- [ ] Output: markdown report (findings + screenshots + persona commentary)
- [ ] Test against 20 real sites, post results publicly
- [ ] Offer "done for you" persona audits to 30 companies ($500-1,500/site)
- [ ] Landing page: paste URL → get free mini-audit (3 personas, 1 page)
- [ ] **GATE: Only proceed to Phase 1 if validation metrics hit thresholds**

### Phase 1: Foundation (Weeks 5-7)
- [ ] Project setup: Next.js 15 + Tailwind + shadcn/ui + Drizzle + Supabase
- [ ] Supabase Auth (email + GitHub OAuth)
- [ ] Database schema + migrations (personas, projects, test_runs, findings)
- [ ] RLS policies on tenant-scoped tables
- [ ] Persona CRUD UI (manual creation + 3 pre-built templates)
- [ ] Project CRUD UI (add website URL)
- [ ] Dashboard layout: dark theme (`#0A0A0B`), sidebar, Cmd+K palette
- [ ] Sentry error tracking

### Phase 2: Persona Engine (Weeks 7-9)
- [ ] Vercel AI SDK v6 integration + Langfuse tracing
- [ ] Auto-generate personas from text description
- [ ] Auto-generate personas from URL (crawl + infer)
- [ ] System prompt auto-generation from persona fields
- [ ] Persona set management
- [ ] DiceBear avatar generation + signature colors

### Phase 3: Browser Testing Engine (Weeks 9-13)
- [ ] Trigger.dev v3 setup + fan-out/fan-in jobs
- [ ] Playwright on Railway Docker
- [ ] Anti-bot mitigation: `playwright-extra` + stealth plugin
- [ ] Simple ReAct agent loop (no dual-process, no MCTS)
- [ ] Accessibility tree as primary page representation
- [ ] axe-core checks per page during agent loop
- [ ] CDP built-in vision deficiency simulation (protanopia, deuteranopia, etc.)
- [ ] CDP network/CPU throttling per persona
- [ ] Deterministic color contrast computation (no LLM for this)
- [ ] Incremental finding writes (idempotent upserts)
- [ ] Session step recording (screenshots + accessibility snapshots)
- [ ] Supabase Realtime for live progress
- [ ] Heartbeats + orphaned run detection
- [ ] Partial results on failure (run marked `partial`, not `failed`)
- [ ] **Unauthenticated pages only in v1**

### Phase 4: Results Dashboard (Weeks 13-16)
- [ ] Circular hero score gauge (Lighthouse-style, 0-100)
- [ ] Persona strip with avatars + individual scores
- [ ] By Persona view (radar chart stats, top findings)
- [ ] By Page view (persona pass/fail per route)
- [ ] Issue list with severity/category/persona filters
- [ ] Finding cards as actionable objects (dismiss, create issue, view evidence)
- [ ] Confidence labels (high/medium/low) per finding
- [ ] Thumbs up/down feedback
- [ ] Session replay: dual-pane (persona vision vs actual), thought bubbles, jump-to-finding
- [ ] Public shareable report URLs (Open Graph meta for Slack/Twitter unfurl)
- [ ] PDF export
- [ ] Three theme modes (dark/light/high-contrast), reduced motion, full keyboard nav
- [ ] **Run MultiPersonas against itself as meta-test**

### Phase 5: CI/CD + CLI (Weeks 16-20) — THE REVENUE UNLOCK
- [ ] GitHub Action (`multipersonas/test-action`)
- [ ] CLI (`mpersonas`): init, run, results, login, whoami
- [ ] `multipersonas.config.ts` with defineConfig
- [ ] API key management (hashed, scoped, rotatable)
- [ ] PR comment posting (update-in-place, collapsible details)
- [ ] Deploy preview auto-detection (Vercel, Netlify, Railway)
- [ ] Baseline storage + regression detection
- [ ] Threshold-based merge blocking
- [ ] SARIF export (GitHub Code Scanning)
- [ ] JUnit XML export
- [ ] Stripe: per-org subscriptions + overage billing
- [ ] Usage tracking + limit enforcement

### Phase 6: Accessibility Depth (Weeks 20-24)
- [ ] Keyboard-only navigation testing (automated tab sequences)
- [ ] Focus trap detection
- [ ] Touch target size measurement (WCAG 2.5.8)
- [ ] Flesch-Kincaid reading level scoring
- [ ] Information density metrics
- [ ] Accessibility scoring per persona (weighted WCAG criteria)
- [ ] Accessibility radar chart
- [ ] IBM Equal Access rules (extend axe-core coverage)
- [ ] Overlay detection (detect AccessiBe etc., test with/without)

### Phase 7: Integrations + Growth (Weeks 24-30)
- [ ] Webhooks API (test.completed, finding.created, score.regressed)
- [ ] GitHub Issues integration
- [ ] Slack interactive messages (Block Kit)
- [ ] REST API + OpenAPI spec
- [ ] Historical comparison dashboard (trends across deploys)
- [ ] Regression alerts
- [ ] AI-suggested fixes for common issues (contrast, alt text, labels)
- [ ] Test result caching (skip unchanged page+persona combos)
- [ ] Cloudflare R2 for screenshot storage

### Post-Launch: Build Only If Customers Ask
- [ ] Codebase analysis (if developers request it)
- [ ] Authenticated page testing (credentials, MFA, session management)
- [ ] Linear/Jira integration (enterprise demand)
- [ ] VPAT evidence package (enterprise procurement — human review required)
- [ ] Competitor comparison testing
- [ ] Cultural/language persona testing
- [ ] Cross-device journey testing
- [ ] B2B buying committee simulation
- [ ] Figma plugin
- [ ] Emotional journey mapping
- [ ] Azure DevOps / GitLab CI / Jenkins / Bitbucket Pipelines
- [ ] SCIM provisioning
- [ ] Data residency options
- [ ] SOC 2 Type I → Type II

---

## Key Technical Decisions {#decisions}

| Decision | Choice | Why | Alternative Considered |
|----------|--------|-----|----------------------|
| Persona simulation model | Claude Sonnet 4.6 | Best cost/quality for agentic tool-calling loops | GPT-4o (slightly worse at tool calling) |
| Report synthesis model | Claude Opus 4.6 | Complex multi-persona analysis needs highest reasoning | Sonnet (cheaper but less nuanced conflict detection) |
| Navigation model | Claude Haiku 4.5 | Cost optimization: simple click/scroll decisions don't need Sonnet | Sonnet for everything (3x more expensive) |
| Page representation | Accessibility tree primary | 500-2K tokens vs 10K+ for full DOM. Structurally rich. | Screenshots primary (slower, less reliable for action selection) |
| Browser automation | Playwright | Multi-browser, accessibility tree API, CDP access, 100K+ GitHub stars | Puppeteer (Chromium only), Stagehand (newer, less stable) |
| Job queue | Trigger.dev v3 | No timeout limits, TypeScript-native, first-class Next.js | Inngest (timeout concerns), BullMQ (too low-level) |
| ORM | Drizzle | Lighter than Prisma, no codegen, better edge compatibility | Prisma (heavier, code generation step) |
| Browser hosting | Railway → Browserbase | Railway for simplicity at start, Browserbase for scale (50M sessions) | Fly.io (more setup), self-hosted Docker (scaling complexity) |
| WCAG engine | axe-core + IBM Equal Access | axe-core is industry standard (57% coverage), IBM extends it | Pa11y (fewer rules), Lighthouse (subset of axe) |
| Vision simulation | CDP `emulateVisionDeficiency` + custom SVG | Native browser-level rendering, no DOM modification | CSS filter injection (less accurate, modifies layout) |
| Data viz | Recharts (shadcn Chart) + Nivo | Recharts for standard charts (shadcn integration), Nivo for heatmaps/radar | Tremor (no heatmap), D3 (too low-level for this) |
| Realtime | Supabase Realtime | Already using Supabase, no additional infra | WebSocket server (extra deployment), Pusher (vendor lock) |
| Multi-tenancy | RLS with org_id + JWT claims | DB-level enforcement, no app code bugs can leak data | Schema-per-tenant (migration nightmare), app-level only (leak risk) |
| Rate limiting | Upstash Redis sliding window | Too many writes for Postgres, Redis handles counters well | In-memory (no persistence), Postgres (write pressure) |
| Screenshot storage | Supabase Storage → Cloudflare R2 | Start simple, migrate when egress costs matter (R2 = free egress) | S3 ($0.09/GB egress), Supabase only (fine at small scale) |
| LLM observability | Langfuse | Vercel AI SDK integration, cost tracking, quality scoring | Braintrust (heavier), custom logging (reinventing wheel) |
| Export format | SARIF + JUnit XML | SARIF → GitHub Security tab. JUnit → native CI. Both are standards. | Custom JSON only (no ecosystem integration) |
| Credential storage | Supabase Vault (AES-256-GCM) | Purpose-built, per-org encryption keys, never logs secrets | Env vars (no per-org isolation), custom encryption (reinventing) |

---

## Success Metrics {#metrics}

### Product Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Time to first test | < 60 seconds from signup | PostHog onboarding funnel |
| Persona generation quality | Users keep 70%+ of auto-generated personas | Edit/delete rate after generation |
| Finding accuracy | < 10% false positive rate on P0/P1 | User feedback: thumbs up/down ratio |
| Finding confirmation rate | > 75% of findings marked valid | Thumbs up / (thumbs up + thumbs down) |
| Finding-to-fix rate | > 40% of confirmed findings lead to code changes | Tracking via issue tracker two-way sync |
| Test completion rate | > 95% of runs complete without error | Trigger.dev job success ratio |
| CI/CD adoption | 30%+ of active users enable within 60 days | GitHub Action installation tracking |
| User retention | 40%+ MAU at month 3 | PostHog cohort analysis |
| Persona diversity | Average 4+ personas per project | DB analytics |
| Page coverage | Average 8+ pages tested per run | DB analytics |

### Validation Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Recall on known issues | > 70% on ground-truth corpus | Quarterly validation pipeline |
| Persona behavioral diversity | Statistically significant inter-persona variability | PersonaTester methodology |
| Persona consistency | > 80% intra-persona agreement across repeated runs | 20x repeated run measurement |
| WCAG detection coverage | > 60% of automatable criteria | Comparison vs axe-core + IBM EA baselines |

### Business Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Free → Pro conversion | > 5% within 30 days | PostHog funnel |
| Monthly churn (Pro) | < 5% | Stripe subscription events |
| LLM cost per run | < $0.75 (with caching/routing) | Langfuse cost tracking |
| Gross margin | > 60% | Revenue - (LLM + infra) per run |
| NPS | > 50 | Quarterly survey |

---

## Behavioral Science Foundation {#behavioral-science}

Our persona model goes beyond demographics. Five science-backed dimension groups:

### Cognitive Profile
- **Information Foraging** (Pirolli & Card): Each persona has a "scent vocabulary" — words/cues that attract or repel. An expert reads jargon as strong scent; a novice finds it repellent.
- **Satisficing vs Maximizing** (Simon/Schwartz): Satisficers take first "good enough" option; maximizers compare exhaustively. Not a fixed trait — varies by task context. Busy parent buying diapers satisfices; same person buying a car maximizes.
- **Fitts's Law**: Movement time = f(distance/target size). Small targets disproportionately punish motor-impaired + mobile users. Calculate effective target sizes against persona motor profiles.
- **Hick's Law**: Decision time = f(log2 of choices). Nav menus with 15 items create measurably more cognitive load than 7. Flag decision overload against persona thresholds.
- **Attention patterns**: F-pattern for text pages, Z-pattern for visual. Elderly read more linearly and thoroughly — don't skip content like younger users.

### Emotional Profile
- **Self-efficacy score**: Low-efficacy personas abandon forms after a single validation error; high-efficacy retry and experiment.
- **Trust evaluation weights**: Young users weight social proof; elderly weight institutional authority and phone numbers.
- **Decision fatigue rate**: Each decision depletes a finite resource. By the 5th dropdown, completion drops. Lower threshold for cognitive impairment personas.

### Cultural Profile
- **Hofstede dimensions**: High uncertainty-avoidance cultures (Japan, Germany) prefer structured nav and confirmation steps. Collectivist cultures respond to testimonials; individualist to personal achievement.
- **Context level**: High-context cultures (East Asian) comfortable with dense pages; low-context (US, Northern European) find them overwhelming. "Too cluttered" must be persona-relative.
- **Format expectations**: Date (MM/DD vs DD/MM), name fields (family name first), phone formats, address hierarchy, payment methods (iDEAL, PIX, UPI).

### Accessibility Profile (Extended)
- **Energy budget**: Spoon theory — disabled users have finite energy. 20 clicks costs more "spoons" than 5. Track depletion across session.
- **Intersectional**: 70-year-old + mild cognitive decline + phone + moving car. No single WCAG criterion captures this.
- **Neurodiversity**: ADHD pulled toward novel stimuli, away from long forms. Autistic users prefer explicit literal language. Dyslexic users struggle with justified text + serif fonts at small sizes.
- **Situational disabilities**: Phone in bright sunlight, one hand holding baby, noisy café.

### Behavioral Economics Susceptibility
- **Anchoring sensitivity**: $299 Enterprise makes $49 Pro feel reasonable — but price-sensitive personas may read high price as "not for me."
- **Loss aversion weight**: Downgrade flows emphasizing what you'll lose are effective but feel manipulative to frustrated personas.
- **Default acceptance rate**: Most accept defaults; privacy-conscious and maximizer personas actively modify. Pre-checked consent boxes convert at 70%+ for default-acceptors but damage trust with the privacy-conscious.
- **Social proof responsiveness**: Testimonials from peers > celebrity for most segments; authority-respecting personas respond more to expert endorsement.

---

## Novel Testing Approaches {#novel-testing}

Features nobody else offers — ranked by novelty and feasibility:

### 1. Competitor Comparison Testing
Run identical personas on YOUR site and a competitor's. Compare task completion, step count, friction. "Your checkout takes persona X 4 steps. Amazon's takes 2." AgentA/B paper (100K virtual personas on Amazon.com) proves feasibility.

### 2. Collaborative/Committee Testing (B2B Killer Feature)
B2B buying committees average 8.2 stakeholders. Simulate: technical evaluator browsing feature docs, CFO checking pricing, end-user trying the demo. Measure whether the site serves all of them. Zero competition, massive B2B demand.

### 3. Cross-Device Journey Testing
Single persona across multiple devices: research on phone → compare on tablet → buy on desktop. Test session continuity (cookies, saved carts, local storage). Nobody does this.

### 4. Temporal/Context Testing
- "User on a lunch break with 2 minutes" vs "user researching carefully"
- First visit vs return visit behavior
- Different referral sources (Google search vs social media vs direct)

### 5. Dark Pattern Detection FROM User Perspective
Multiple 2025-2026 papers (DPDGPT, UIGuard, DPGuard) detect dark patterns as compliance audits. We detect them as persona experiences: "this confused elderly user just got tricked into subscribing." Regulators explicitly want this perspective.

### 6. Adversarial Persona Testing
"Red team" personas: try to break the site, abuse promotions, create fake accounts, exploit edge cases. "Confused user" persona that deliberately misinterprets UI.

### 7. Error Recovery Testing Per Persona
Same error, different personas: technical user reads error code; non-technical user panics at red text. Expose when error handling only works for power users.

### 8. Content Tone Testing
Same page through different persona lenses: does the humor land with Gen Z but alienate enterprise buyers? Is the copy persuasive for this specific persona?

### 9. Overlay Detection & Testing
Detect if a site uses an accessibility overlay (AccessiBe, etc.). Test pages with overlay ON and OFF. Generate report showing what the overlay actually fixes vs misses. Positions us as the antidote to overlay snake oil. (FTC fined AccessiBe $1M in Jan 2025.)

---

## Advanced Agent Architecture {#agent-architecture}

### Plan-MCTS Over Linear ReAct
Linear ReAct (Reasoning + Acting) is vulnerable to error accumulation. Plan-MCTS (arxiv 2602.14083) decouples planning from execution: Planner generates candidate subplans, Operator executes, Evaluator scores, Reflector diagnoses failures. Far more robust.

### Multi-Agent Debate for False Positive Reduction
One persona agent finds an issue → a second persona agent attempts to reproduce → only confirmed findings survive. Research shows cross-verification between agents reduces hallucination by up to 100% in controlled settings.

### UX Researcher Meta-Agent
Receives structured findings from all persona agents. Groups by page/component. Identifies patterns ("3 of 5 personas struggled with the navigation menu"). Generates synthesis report. This is where real value differentiation lives.

### Ensemble Agreement
Run same evaluation with Claude + GPT-4o. Keep findings both agree on. Dramatically increases precision at cost of some recall.

### Adaptive Testing (Bayesian Exploration-Exploitation)
Quick scan all pages first (shallow evaluation). Score each on complexity + initial finding density. Allocate deeper persona testing time proportionally. If persona finds issues on a page, increase time for other personas on same page.

### Memory Across Sessions
Store per-site episodic memory (page structures, navigation paths, past findings). On repeat runs, retrieve relevant episodes to skip redundant exploration and focus on changed areas. Vector store + embedding similarity.

### Vision Mode
Evaluate interfaces purely from screenshots, no DOM access. Unlocks testing of canvas-rendered apps, WebGL/WebGPU, PDF documents, mobile app screenshots. Dual-mode: DOM for interaction, vision for design evaluation. Claude noted as best model for actionable UI debugging from screenshots.

---

## Engagement & Retention Strategy {#engagement}

### Narrative Findings (Biggest Differentiator)
**Dry:** "Color contrast ratio 2.1:1 on .btn-primary fails WCAG AA (minimum 4.5:1)"
**Narrative:** "Rosa, who has low vision, cannot distinguish your 'Buy Now' button from the background. She sees a flat gray page where you see a vibrant CTA."

Narrative version is more memorable, more shareable in standups, and more likely to get fixed. Microsoft Inclusive Design research confirms: attaching findings to named personas increases fix rates.

### AI-Suggested Fixes (Killer DX Feature)
Not just finding problems — suggesting fixes. Generate a PR that fixes a contrast ratio issue. Save 30 minutes per finding. This is the highest-impact developer experience feature.

### Scoring That Drives Action
- Composite 0-100 score for dashboard, but always show breakdown
- **Trend over time** is more valuable than absolute number ("65 → 89 in 3 months")
- Severity-based prioritization: "Rosa cannot complete checkout" (P0) beats abstract scores
- Quality gates (like SonarQube): binary deploy/don't-deploy creates more behavior than grades

### Retention Formula
**CI/CD integration** (habitual) + **narrative findings** (memorable) + **1-click fixes** (valuable) + **trend tracking** (progress visible) = sticky product

### Smart Gamification
- Accessibility score as coverage metric ("73% persona coverage" = engineering, not games)
- Rare meaningful badges: "Zero persona regressions for 30 days"
- Team trends: "Your team improved 12 points this sprint"
- CI/CD streak: "12 consecutive deploys without persona regressions" (loss aversion)
- "Tested by MultiPersonas" badge for websites (free marketing)

---

## Legal & Compliance Opportunity {#legal}

### Accessibility Lawsuits: The Market Force
- ~4,600+ federal ADA website lawsuits/year in US (plus ~10x demand letters)
- Average settlement: $5K-$150K. Major retailers: $6M+
- 96-97% of top 1M homepages have detectable WCAG failures (WebAIM Million)
- EU Accessibility Act: fines up to 3M euros, enforced since June 2025

### VPAT/ACR Auto-Generation (Premium Feature)
Companies pay $5K-$20K per VPAT from firms like Level Access/Deque. We can auto-generate draft VPATs by mapping persona test results to WCAG success criteria. Justifies $500-$2,000/report or anchors enterprise tier.

### Audit Trail as Legal Protection
Timestamped test results, remediation tracking, persona-based coverage across disability types = strong "due diligence" evidence. Courts distinguish "we didn't know" (weak) from "we actively test and remediate" (strong).

### Privacy-Persona Testing
Test as cookie-declining user. Verify: site functions without tracking cookies, deletion requests honored, consent checkboxes present. Extends product into GDPR compliance testing.

### Industry-Specific Compliance Packs
- **Healthcare**: Patient portal accessibility (ADA + HIPAA)
- **Finance**: Banking app accessibility (CFPB guidance, $5M-$12M settlements)
- **Education**: EdTech VPAT required for school sales (Section 504)
- **Government**: No VPAT = no sale ($700B+ US federal procurement annually)
- **E-commerce**: Primary EAA target (all EU-selling companies)

---

## Enterprise Features {#enterprise}

### Procurement Gates
| Requirement | Status | Priority |
|------------|--------|----------|
| SOC 2 Type II | Plan for Type I by month 12, Type II by month 18 | Critical |
| SSO/SAML | Include in paid plans (not enterprise-gated) | Critical |
| SCIM provisioning | Enterprise tier | High |
| Data residency (EU) | Region selection per org | High |
| ISO 27001 | Plan for year 2 | Medium |
| HIPAA BAA | Healthcare customers only | Low initially |

### Design System Testing (No Incumbent)
- Storybook plugin: run persona simulations per component story
- "Your DatePicker fails for keyboard-only users" tied to specific stories
- Design token validation: color contrast across persona simulations
- Regression detection when components change

### Multi-Brand/Multi-Site Management
- Portfolio dashboard: "47 sites ranked by persona accessibility"
- Cross-site pattern detection: "Same contrast failure on 23 of 47 sites"
- Centralized persona management across all properties
- C-level rollup: portfolio risk score, monthly trends, worst performers

### Agency/Consultancy Tier
- Multi-client dashboard with per-client billing
- White-label reports (agency branding)
- Client-shareable links (no login required)
- High-retention revenue: switching costs are high once reports established

### Enterprise CI/CD Coverage
Must-have: GitHub Actions, Azure DevOps, GitLab CI, Jenkins, Bitbucket Pipelines (covers 90%+ market). Plus: Jira, ServiceNow, Teams, Confluence, SharePoint integrations.

---

## Longevity & Strategic Moats {#longevity}

### 6-Month Milestone (Oct 2026)
**Must ship:** CI/CD integration, WCAG 2.2 reporting tied to personas, public API, session replay. **Why:** The window where no competitor has developer workflow integration is closing. First-mover in CI/CD persona gates establishes the category.

**Market timing:** EU Accessibility Act enforcement active. Accessibility testing market ~$850M. Demand is real, not theoretical.

### 1-Year Milestone (Apr 2027)
**Must have:** 500+ enterprise CI/CD integrations, aggregated benchmarks across 1,000+ sites, 50+ community persona templates, historical baselines per customer. **Why:** These create switching costs and data moats that are impossible to replicate.

**Enterprise split:** Self-serve = 80%+ of accounts (adoption), enterprise = 60%+ of revenue (money). Bottom-up adoption drives enterprise contracts 6-12 months later.

**Model costs:** LLM inference costs dropping ~90% by 2030. Shift moat from "we're cheaper" to "we generate better insights from cheap models."

### 5-Year Vision (Apr 2031)
**Category evolution:** Accessibility compliance becomes as standard as HTTPS. We become the scoring/insight layer. Let others own the browser — we own the interpretation.

**Platform play:** Tool → Platform. Third-party persona plugins, custom check marketplace, persona specification standard. Community personas create network effects.

**Acquisition targets:** BrowserStack (#1 fit), Vercel/Netlify, GitHub, Deque, Figma. Valuation drivers: enterprise ARR, unique data assets, integration depth.

### Moat Priority (Ranked)

| Moat | Why | Timeline |
|------|-----|----------|
| **CI/CD integration depth** | Highest switching costs. No competitor has it. | Month 1-6 |
| **Cross-site benchmark data** | Begins compounding from first customer. Defensible at 5K+ sites. | Month 3+ |
| **Persona specification standard** | If others adopt your format, you win the ecosystem. | Month 6-12 |
| **Enterprise contracts** | 12-24 month contracts create revenue predictability. | Month 9+ |
| **Community persona library** | Slower to build, most defensible long-term. Network effects. | Month 6+ |
| **"Lighthouse for UX" brand** | Requires content, conferences, open-source presence. | Ongoing |

### Technology Hedges

| Threat | Hedge |
|--------|-------|
| LLM costs → near-zero | Moat shifts to data/benchmarks, not compute efficiency |
| Big player ships persona testing | Win on depth + data before they catch up |
| New AI architecture replaces LLMs | Model-agnostic persona engine; value in data layer |
| Browser-native AI commoditizes basic checks | Own complex multi-persona, cross-site analysis |
| Open source replicates core | Monetize managed platform, benchmarks, enterprise support |
| OpenAI Operator adds persona testing | Persona testing is a product, not a feature toggle. Requires framework, library, reporting, CI. |

### What Makes Dev Tools Survive Long-Term
From studying ESLint, Prettier, Playwright, and failed tools (Test.ai, early AI testing tools):
1. **Solve pain everyone has** — 96% of sites fail accessibility, every site has UX issues
2. **Embed in the default workflow** — CI/CD integration makes us mandatory, not optional
3. **Appear in every tutorial** — open-source CLI + GitHub Action + community templates
4. **Skipping creates visible risk** — accessibility lawsuits + EU fines make this "required" not "nice"
5. **Infrastructure, not novelty** — the EAA enforcement is the forcing function

---

## Research Sources {#sources}

### Academic Papers
- UXAgent: LLM Agent-Based Usability Testing (Amazon Science, arxiv 2504.09407)
- PersonaTester: Automated Crowdsourced GUI Testing (arxiv 2603.24160)
- SimAB: Persona-Conditioned A/B Test Simulation (ETH Zurich/Adobe, arxiv 2603.01024)
- Stanford Generative Agents: Simulating 1,052 Individuals (Stanford HAI)
- Anthropic Persona Selection Model (March 2026)
- ScreenAudit: LLM-Based Accessibility Error Detection (CHI 2025)
- Beyond Pixels: DOM Downsampling for Web Agents (arxiv 2508.04412)

### Tools & Platforms
- Browser Use (github.com/browser-use) — 81K+ stars
- Stagehand v3 (Browserbase) — act/extract/observe primitives
- axe-core (Deque) — Industry standard WCAG engine
- IBM Equal Access — Extended ACT rule coverage
- Guidepup — Screen reader automation + virtual-screen-reader
- text-readability — Flesch-Kincaid + 5 other readability algorithms
- UK Government Accessibility Personas — Gold standard disability persona set

### Design References
- Linear UI redesign — LCH color space, warm grays, three-variable theming
- Vercel Analytics dashboard — Card-based KPI strip, sidebar nav pattern
- Percy visual testing — Three-panel comparison (baseline/current/diff)
- Dovetail — Tag-based insight clustering, evidence traceability
- PostHog — Developer-first dashboard, AI-powered viz
- Cypress Cloud — Test run timeline, parallelization analytics
- Hotjar/FullStory — Session replay UX patterns

### Competitor Analysis
- Snap/Versive, Synthetic Users, Uxia, Blok, PersonaIQ, Qwarm, UXAgent, SimAB
- QA Wolf, Checkly, Percy/Applitools, BrowserStack, Browserbase

### Security & Infrastructure
- Supabase multi-tenancy docs, Supabase Vault docs
- Stripe API key design patterns
- Anthropic API usage policy (data not used for training)
- OWASP API Security Top 10
- Upstash rate limiting patterns

### Scaling & Reliability
- Trigger.dev retry, heartbeat, and onFailure patterns
- Railway Playwright deployment guide
- Browserbase session management (50M+ sessions)
- Fly.io autoscale machine patterns
- Claude API rate limits by tier

### Observability
- Langfuse + Vercel AI SDK integration
- PostHog Next.js App Router setup
- Sentry Next.js integration
- Betterstack uptime monitoring

### Integrations
- Sentry Jira two-way sync architecture
- Stripe/GitHub webhook signature verification
- SARIF v2.1.0 specification (OASIS)
- JUnit XML format
- VPAT/ACR format for enterprise procurement
- Linear OAuth + GraphQL API

### Validation
- Stanford Generative Agents validation methodology (85% retest reliability)
- PersonaTester inter/intra-persona variability measurement
- SimAB ground-truth validation against 47 A/B tests
- LLM persona drift research (20-40% degradation over 10-15 turns)
- NN/g synthetic users guidelines

### Go-to-Market
- Dev tool landing page patterns (Vercel, Linear, Supabase)
- Product Hunt dev tool launch strategies
- A11y community distribution channels (axe-con, A11y Weekly, CSUN)
- GitHub Actions marketplace as distribution
