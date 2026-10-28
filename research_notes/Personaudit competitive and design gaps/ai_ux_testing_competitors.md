# AI UX testing and agentic QA competitors to Personaudit's persona layer (snapshot 2026-10-10)

Scope note: ~25 search/fetch calls. Vendor pages and vendor blogs are marked (V). Pricing from third-party blogs is marked (3P, unverified). Not covered with usable evidence: UserTesting AI, Useberry, Uizard/Galileo, Heurio, Figma "AI persona" plugins, testRigor, Autify, Reflect, Octomind, Checksum details, Anthropic/OpenAI computer-use as testers. See Gaps in each section.

## 1. Who sells synthetic users / AI usability testing / agent QA, and what do they deliver?

### Takeaway
Three tiers exist. (a) Closest to Personaudit `run`: persona agents that browse a live URL and return replay plus report (Versive Snap, Mockingbird, SimUser AI, Loop11 AI browser agents, UXAgent research). (b) Interview-style synthetic respondents with no browsing (Synthetic Users, Uxia on prototypes). (c) Deterministic-or-predictive "AI audit" tools (Baymard UX-Ray, Attention Insight, Neurons) and agentic QA (QA Wolf, Momentic). Only tier (a) overlaps the persona layer, and it is a crowded, young, mostly unpriced niche.

### Cited Findings
- Versive Snap (closest direct competitor): paste a URL, set a task, a custom AI persona navigates while thinking aloud; output is report with recommendations, video replay and full transcript; Word/Markdown download and public share links; also runs automatic accessibility checks on live sites; free trial, prices not listed (V) — [Snap intro](https://getversive.com/blog/introducing-snap)
- Versive docs: per-run transcripts and screenshots, aggregated summary with prioritized recommendations; website tests add step-by-step action log, screenshots and full session recording; max 50 runs per launch, 50 browser steps (100 extended); 1 credit per website run (up to 2 extended); charged only for successful runs; failed run retried once; optional SUS questionnaire; project duplication to test a new design version; each run snapshots its config — [Versive AI tests docs](https://docs.getversive.com/ai-tests/overview)
- Mockingbird: paste URL, AI personas browse, "full video replay" plus findings report broken down by severity; no pricing on page; Product Hunt snapshot 0 upvotes, #156 daily, launch date not stated — [hunted.space](https://www.hunted.space/product/mockingbird-3)
- SimUser AI: personas (New User, Security Engineer, Mobile User) drive a live app via real browser automation; screenshots, video, qualitative UX feedback with NPS scores; "self-healing flows"; credit-based from $49/mo; 0 upvotes on PH — [hunted.space](https://hunted.space/dashboard/simuser-ai)
- Persona Runner (Mphasis) lists AI browser agents simulating personas on any live web UI on AWS Marketplace (snippet only) — [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-bg2bryvbk4qpa)
- Loop11 AI browser agents (early 2025): choose an agent, define tasks, agent navigates prototype or site; session recorded; metrics: task completion, lostness, page views, duration, NPS/SUS (V) — [Loop11 Medium](https://loop11.medium.com/introducing-ai-browser-agents-a-new-way-to-run-usability-tests-in-loop11-31f08e9b70ab), [Loop11 comparison](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/)
- Synthetic Users: interview-style synthetic participants; Research Tokens pool; can test images, video, live websites; RAG over your own transcripts; saturation score; claims SOC 2 (V) — [pricing page](https://www.syntheticusers.com/pricing)
- Uxia (Barcelona): AI synthetic testers for unmoderated usability and A/B tests; ~EUR 1M pre-seed Nov 2025; plan prices not found, one third-party source says flat subscription with unlimited tests (3P, unverified) — [Dealroom](https://app.dealroom.co/news/feed/uxia-secures-1m-for-ai-user-testing)
- Maze: AI Moderator expanded Apr 2026, AI Conversation Block Jul 2026 (3P summary); these are AI-moderated interviews with real participants, not found to be simulated participants — [Outset almanac (3P)](https://outset.ai/almanac/outset-vs-maze-features-pricing-and-verdict-(2026))
- Lyssna: AI follow-up questions and AI summaries on paid plans; real-participant panel — [Koji pricing (3P)](https://www.koji.so/blog/lyssna-pricing-2026)
- Hotjar/Contentsquare: AI session-replay summaries ("Sense"), rage-click and u-turn detection, JS error tracking on real traffic; Free tier 200k sessions/mo — [Hotjar recordings](https://www.hotjar.com/product/recordings/), [Hotjar pricing](https://hotjar.com/pricing-csq)
- Baymard UX-Ray: automated heuristic audit on live URL or screenshots; 346 heuristics, 95% accuracy vs Baymard human auditors on 79 sites; pipeline of 15+ systems mostly not generative AI; raw data published; self-reported, ~5% inaccurate — [Baymard](https://baymard.com/blog/ai-heuristic-evaluations)
- Attention Insight / Neurons (VisualEyes successor): predictive attention heatmaps from images; vendor claims 90-96% (AI) and 93-95% (Neurons) accuracy vs eye tracking; no independent validation found — [Attention Insight](https://attentioninsight.com/attention-insight-vs-vizit/), [Neurons](https://neuronsinc.com/visualeyes-predict)
- QA Wolf: managed service, quote-led, priced by tests under management with unlimited runs; third-party estimate ~$8k/mo for ~200 tests (3P) — [QA Wolf pricing post](https://qawolf.com/blog/qa-wolf-is-reinventing-qa-pricing), [Sacra](https://sacra.com/chat/h/bb0c3a1e-c8d7-4df9-bf63-8bbbd8721c13/)
- Momentic: credit-based, 2,000 free credits, overage $0.01875/credit per one index (3P); another source says $250/mo starting (3P, conflicting) — [aipricing.guru](https://www.aipricing.guru/ai-qa-agentic-test-automation-pricing-index/), [Momentic vs QA Wolf](https://momentic.ai/comparison/momentic-vs-qa-wolf)
- Checksum: pricing on request, per workflows maintained (3P) — [CTO Club](https://thectoclub.com/tools/checksum-vs-qa-wolf/)
- Stagehand (Browserbase, open source) is the common building block for NL browser agents; Browserbase usage-based (3P directories) — [Skyvern review (competitor)](https://skyvern.com/blog/stagehand-alternatives-pricing-reviews/)
- UXAgent (Northeastern/Amazon/Notre Dame): persona generator + LLM agent + universal browser connector; video replay interface, agent interview interface, result viewer; for piloting study design before human studies; evaluated by heuristic review with UX researchers, not against human outcomes — [arXiv 2504.09407](https://arxiv.org/abs/2504.09407)
- UXCascade (Jan 2026): tool to aggregate and present agent-generated usability feedback at scale, linking agent reasoning to issues — [arXiv 2601.15777](https://arxiv.org/html/2601.15777v1)

### Inferences
- The URL-in, replay-plus-report-out pattern is now a commodity feature of 4+ products; replay and transcript are table stakes, not a differentiator.
- Versive Snap crosses Personaudit's boundaries: persona "feedback and recommendations", bundled accessibility checks beside persona output. Contrast, not a model.
- Quiet competitors (Mockingbird, SimUser) show weak traction (0 upvotes), so the niche is not proven for demand.

### Gaps
- No usable data on UserTesting AI, Useberry, Uizard/Galileo critique, Heurio, Figma AI-persona plugins, testRigor, Autify, Reflect, Octomind (search returned nothing relevant), or Anthropic/OpenAI computer-use used as a test product.
- Mockingbird and SimUser launch dates and real pricing tiers not found.

## 2. Which output formats convince buyers?

### Takeaway
Vendors lead with video/session replay, step logs with screenshots, think-aloud transcripts, severity-ranked findings, and standard metrics (completion rate, lostness, SUS/NPS). Shareable links and Word/Markdown export serve the consultant-to-client handoff. No source gives buyer-conversion evidence for any format.

### Cited Findings
- Replay + transcript + report + public share links: [Versive Snap](https://getversive.com/blog/introducing-snap)
- Video replay + severity-ranked report: [Mockingbird](https://www.hunted.space/product/mockingbird-3)
- NPS scores + screenshots + video: [SimUser](https://hunted.space/dashboard/simuser-ai)
- Completion, lostness, page views, duration, NPS, SUS: [Loop11](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/)
- Replay viewer + agent interview interface (interrogate the agent after the run): [UXAgent](https://arxiv.org/abs/2504.09407)
- Saturation score (when new synthetic participants stop adding themes): [Synthetic Users](https://www.syntheticusers.com/pricing)
- Predictive heatmaps (attention): [Neurons](https://neuronsinc.com/visualeyes-predict)

### Inferences
- Personaudit already has task success (achieved/blocked), which is a cleaner, falsifiable metric than most competitors' NPS from a simulated agent.
- Agency buyers need client-facing artifacts: replay, share link, exportable report.

### Gaps
- No evidence on which format drives purchase or retention.

## 3. Trust and validity: published validation, disclaimers, criticism

### Takeaway
Validity evidence is thin and mostly self-reported. The one head-to-head with numbers (Loop11, vendor-run) shows agents far below humans on task success. NN/G is explicitly skeptical of synthetic users; the criticism targets interview-style simulation more than browsing agents, but sycophancy and shallowness arguments carry over to "opinion" output. Personaudit's 0% false-success claim at n=2 is small but is a more specific, checkable claim than competitors make.

### Cited Findings
- NN/G (Jun 2024): synthetic users give shallow, overly favorable answers; synthetic learner claimed all courses completed vs real "three of seven"; ChatGPT "vastly outperformed" real people on tree testing so was not an acceptable substitute; use only for hypothesis generation, desk research, pilots; "treat outputs as hypotheses, not findings" — [NN/G Synthetic Users](https://www.nngroup.com/articles/synthetic-users/)
- NN/G (Aug 2025): digital twins built on rich interview data beat demographic personas (0.85 vs 0.70 individual accuracy on GSS); synthetic responses cluster around the mean, hiding polarized opinions; "complement, not replace" — [NN/G AI-simulated behavior](https://www.nngroup.com/articles/ai-simulations-studies/)
- NN/G on AI UX tools: most vendors publish no accuracy; GPT-4 audit 2023 was 20% accurate with 80% false positives and found 14% of issues; Microsoft 2025 study of four tools 50-70%; advises asking vendors for evaluation data, limitations, guardrails — [NN/G Baymard accuracy](https://www.nngroup.com/articles/baymard-ai-tool-accuracy/)
- Loop11 (V, no sample sizes, two prototypes): AI agents completed 0-25% (project 1) and 5-21% (project 2) of tasks vs humans 62-95% and 73-87%; agents took more pages, revisited pages; gave no subjective feedback; positioned as complement for quick scans and triage — [Loop11](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/)
- Synthetic Users (V): claims "85-92% synthetic-organic parity" and "21+ peer-reviewed papers", studies not linked; FAQ concedes it is a discovery aid — [pricing page](https://www.syntheticusers.com/pricing)
- Versive: "research shows AI agents can simulate individual personalities with high accuracy" with no citation; "not a replacement for testing with real users" — [Snap intro](https://getversive.com/blog/introducing-snap)
- Baymard publishes methodology, raw data and screenshots and limits itself to heuristics at 95%; this is the credibility bar NN/G holds up — [Baymard](https://baymard.com/blog/ai-heuristic-evaluations)
- Academic: GenderMag comparison (LLM agents vs 3 workshops, 9 humans): broad overlap on generic issues, agents rate severity consistently higher, each side misses things — [search summary, paper not opened; ACM TIIS]. UXAgent evaluation was researcher perception only.
- Userbrain experiment: synthetic users failed where real users failed on one task, succeeded where humans failed on another — [Userbrain](https://userbrain.com/blog/synthetic-users-experiment/) (snippet only)

### Inferences
- Agent severity inflation (GenderMag) supports Personaudit's choice to never assign severity to opinion.
- A published, reproducible task-success validation (n larger than 2, with human baseline) would exceed what nearly every competitor offers. Loop11 shows the risk: agent completion can be far below humans, so "blocked" must be separated into site-blocked vs agent-limited.
- Reporting agent-limited failures as site defects is the main false-positive risk in this category.

### Gaps
- No independent academic validation of commercial persona-browsing tools found. GenderMag paper and Userbrain details not read in full. Reddit, HN, Product Hunt comment threads not reached.

## 4. Pricing and packaging

### Takeaway
Three models: annual enterprise token/seat contracts (Synthetic Users from $12.5k/yr, Maze AI enterprise), credit-per-run (Versive 1 credit per website run, SimUser from $49/mo, Momentic credits), and managed per-test subscriptions (QA Wolf). Per-run credits is the norm for the browsing-agent niche. Most vendors hide price.

### Cited Findings
- Synthetic Users: annual plans from $12,500/yr, token pool, unlimited seats, "$2-60 per interview" — [pricing](https://www.syntheticusers.com/pricing)
- Versive: credits per persona run, charged only on success, free retry — [docs](https://docs.getversive.com/ai-tests/overview)
- SimUser: from $49/mo credit-based — [hunted](https://hunted.space/dashboard/simuser-ai)
- Maze: Starter ~ $99/mo, AI features reportedly Enterprise; average contract ~$29k (3P, from competitor Koji) — [Outset almanac](https://outset.ai/almanac/outset-vs-maze-features-pricing-and-verdict-(2026))
- Lyssna: Growth ~$165/mo annual (3P, sources conflict) — [Koji](https://www.koji.so/blog/lyssna-pricing-2026)
- Hotjar: Free tier includes AI summaries — [Hotjar pricing](https://hotjar.com/pricing-csq)
- QA Wolf per-test, Momentic credit-based: see section 1.

### Inferences
- Charging only for successful runs (Versive) is a trust feature Personaudit could match.
- Agency wedge fits per-project or per-run packs better than seats.

### Gaps
- Versive, Uxia, Mockingbird, UserTesting paid prices unknown. Personaudit's own pricing page not compared here.

## 5. Features Personaudit lacks (from competitor evidence)

### Takeaway
Present at competitors, unconfirmed in Personaudit (verify against the codebase before acting): session replay/video, shareable public report links, Word/Markdown export, goal templates, post-run "interview the agent", SUS questionnaire, project versioning and re-run on new release, run credits with success-only billing, Figma/prototype input. CI regression on task success and release-over-release comparison are not shown by the persona competitors, so they would be differentiators.

### Cited Findings
- Replay, share links, export, transcripts: [Versive](https://getversive.com/blog/introducing-snap)
- Interview the agent: [UXAgent](https://arxiv.org/abs/2504.09407)
- Duplicate project to test new version; config snapshot per run; SUS option; Figma prototype input: [Versive docs](https://docs.getversive.com/ai-tests/overview)
- Self-healing flows (SimUser) and managed regression suites (QA Wolf, Momentic) cover flow regression, but as QA not UX: [SimUser](https://hunted.space/dashboard/simuser-ai), [Momentic vs QA Wolf](https://momentic.ai/comparison/momentic-vs-qa-wolf)
- Slack alerts: no competitor evidence found.

### Inferences
- The gap between UX-agent tools (no CI gate) and QA tools (no persona/goal realism) is where Personaudit's `--baseline/--fail-on` plus persona task-success could sit.

### Gaps
- Did not audit Personaudit's current feature set; "lacks" is relative to the product description given.

## 6. What agencies would pay for

### Takeaway
Inference only; no agency-buyer evidence was found. Competitors' packaging points to client-ready deliverables, repeatability, and defensibility.

### Cited Findings
- Public share links and downloadable reports target stakeholders and clients: [Versive](https://getversive.com/blog/introducing-snap)
- NN/G advises buyers to demand evaluation data, so agencies face blame for wrong AI findings: [NN/G](https://www.nngroup.com/articles/baymard-ai-tool-accuracy/)

### Inferences
- Likely paid value: branded/white-label client report with replay and failing-step screenshots; deterministic axe findings as compliance core; persona task-success as "can a first-time visitor complete checkout" evidence; pre/post-launch comparison for retainers.
- Opinion layer is a weak purchase driver given NN/G skepticism; keep it secondary and labeled.

### Gaps
- No interviews, Reddit/HN threads, or agency surveys retrieved.

## Prioritized list (tied to evidence)

Verify "missing" items against the repo first.

1. Should improve (validity): extend task-success validation beyond n=2 with a human baseline, publish method and raw data (Baymard model; NN/G asks vendors for this; Loop11 shows agent completion can badly trail humans). Separate "site-blocked" from "agent-limited" in blocked results.
2. Missing (table stakes): step timeline with screenshots plus session replay of agent run (Versive, Mockingbird, SimUser, UXAgent all ship it).
3. Missing (agency wedge): shareable report link and Word/Markdown/PDF export, ideally white-label (Versive).
4. Should create (differentiator): task-success regression across releases and a CI gate (`--fail-on` for persona goals); no persona competitor shows this.
5. Should add: goal templates (checkout, signup, contact) and reusable saved goals per client site; re-run/duplicate-project flow with config snapshot (Versive docs).
6. Should add: success-only billing and free retry on agent infrastructure failures (Versive); per-run packs for agencies.
7. Should add (low): post-run "ask the agent why" transcript view (UXAgent), optional SUS (Versive). Weigh against the never-assign-severity opinion constraint.
8. Hold the line: no severity on opinion (GenderMag shows agent severity inflation), no disability simulation, no accessibility claims from personas. Versive bundles a11y checks beside persona output; contrast by keeping axe deterministic and labeled separately.
9. Slack/email alerts on task-success drop: no competitor evidence; low priority until regression tracking exists.
