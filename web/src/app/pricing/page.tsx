import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd, faqSchema } from "@/components/json-ld";
import { StartSoloPlanButton } from "@/components/start-solo-plan-button";
import { UnlockFoundingAccessButton } from "@/components/unlock-founding-access-button";
import { isFoundingCheckoutOpen, isSoloCheckoutOpen } from "@/lib/founding-checkout";
import { PROJECT_LIMITS } from "@/lib/entitlements";
import { trialPeriodDays } from "@/lib/plans";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing: free CLI, hosted workspace from $39",
  description:
    "The keyless CLI and the CI accessibility gate are free forever. Hosted projects, scheduled re-scans and persona task-success start at $39/month. Agency founding access adds white-label reports.",
};

const PRIMARY_CTA = buttonVariants({ size: "lg", className: "w-full sm:w-auto" });
const OUTLINE_CTA = buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" });

type Tier = {
  id: "free" | "solo" | "agency";
  name: string;
  price: string;
  cadence: string;
  who: string;
  features: string[];
  /** Stated plainly next to the price, because the gap is the reason to trust the rest. */
  limits: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    who: "Anyone who wants the evidence and will run it themselves.",
    features: [
      "The CLI, keyless: scans need no API key",
      "Behind-login crawls on your own machine, session never uploaded",
      "axe-core verdict at every state reached",
      "CI gate: baseline today's backlog, fail only on new defects",
      "Markdown report from every CLI run",
      "Hosted grade on up to 10 public pages, no signup",
      `${PROJECT_LIMITS.free} hosted project`,
    ],
    limits: "No scheduled scans, no persona task-success, no exported compliance report.",
  },
  {
    id: "solo",
    name: "Solo",
    price: "$39",
    cadence: "per month",
    who: "One developer or freelancer carrying a handful of sites.",
    features: [
      "Everything in Free",
      `${PROJECT_LIMITS.pro} hosted projects with scan history`,
      "Scheduled re-scans on a cron, not a button you remember",
      "Persona task-success on public flows",
      "Compare retests: new, cleared, and still-open findings",
      "Exportable compliance report (verdicts only)",
    ],
    limits: "Reports carry the Personaudit header, not your own.",
  },
  {
    id: "agency",
    name: "Agency founding",
    price: "$199",
    cadence: "per month",
    who: "Agencies shipping many client sites under ADA and EAA pressure.",
    features: [
      "Everything in Solo",
      "Unlimited client projects",
      "White-label reports under your agency name",
      "Founding price locked for as long as you stay",
      "Cancel any time from the billing portal",
    ],
    limits: "Hosted behind-login scanning is not built yet. It is what this funds.",
  },
];

const CAPABILITY_LEDGER: { capability: string; today: boolean; detail: string }[] = [
  { capability: "Public-page axe-core scan", today: true, detail: "Hosted, free, no signup" },
  { capability: "Behind-login axe-core scan", today: true, detail: "Free CLI only; the session stays on your machine" },
  { capability: "CI gate on new defects only", today: true, detail: "Baseline + fail-on, keyless" },
  { capability: "Scheduled re-scans", today: true, detail: "Solo and agency founding" },
  { capability: "Persona task-success", today: true, detail: "Solo and agency founding, public flows" },
  { capability: "White-label compliance report", today: true, detail: "Agency founding" },
  { capability: "Hosted behind-login scan", today: false, detail: "Not built. Agency founding funds it." },
];

const PRICING_FAQS = [
  {
    question: "Is the CLI really free?",
    answer:
      "Yes, and it is the part that does the compliance work. scan runs axe-core with no API key and no account, including behind a login using a session saved on your own machine. Paying is for the hosted workspace around it: history, schedules, and the exported report.",
  },
  {
    question: "Do you scan behind a login on your servers?",
    answer:
      "No. Behind-login scanning runs in the CLI on your machine, so a client password never leaves your laptop. Hosted behind-login is not built. Agency founding access is what funds it, and you can cancel any time from the billing portal.",
  },
  {
    question: "What happens when the trial ends?",
    answer:
      "The card you entered is charged for the first month. Cancel any time before then from Settings and you are not billed. Your CLI keeps working either way, because it never depended on the subscription.",
  },
  {
    question: "What counts as a project?",
    answer:
      "One site under audit, with its scans, baseline, and history over time. Free includes one so the workspace is genuinely try-able; Solo includes five; agency founding is unlimited.",
  },
  {
    question: "Does a persona decide whether my site is accessible?",
    answer:
      "Never. Only axe-core touches compliance, and it is deterministic and citable. Personas report task success and labeled opinion. We do not simulate disabled users, and nothing here replaces testing with them.",
  },
  {
    question: "How is this different from WAVE, Lighthouse CI, or pa11y-ci?",
    answer:
      "Those are free and worth using. The difference is what happens after the first run. Framework-generated element ids change on every build, so a plain CI gate built on them gets noisy fast on real codebases and teams stop trusting it. Personaudit keys each defect to a render-stable id, so the same broken component reads as the same finding across builds, and your baseline stays honest.",
  },
  {
    question: "Why would I pay $199 a month instead of an enterprise platform?",
    answer:
      "Enterprise accessibility platforms (the Deque axe, Siteimprove, Level Access, Evinced class) are typically sold on annual contracts that run five figures a year, aimed at organizations with a procurement process. Mid-market tools land lower: Pope Tech around $2,000/year, Silktide around $6,000/year. Agency founding access is a monthly price with no sales call, built for a shop running client sites, not a compliance department.",
  },
] as const;

export default function PricingPage() {
  const soloOpen = isSoloCheckoutOpen();
  const foundingOpen = isFoundingCheckoutOpen();
  const openFor: Record<Tier["id"], boolean> = { free: true, solo: soloOpen, agency: foundingOpen };
  const trialDays = trialPeriodDays();

  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <JsonLd data={faqSchema(PRICING_FAQS)} />
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* ── Hero ── */}
        <section className="section-y border-b border-border">
          <div className="frame">
            <p className="label-mono">Pricing</p>
            <h1 className="display mt-3 max-w-2xl text-[clamp(2.2rem,4.6vw,3.5rem)] leading-[1.05]">
              The part that proves compliance is free.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The CLI runs axe-core at every state it reaches, including behind a login, with
              no API key and no account. You pay when you want that evidence kept, scheduled,
              and exportable for a client, not for the scan itself.
            </p>
          </div>
        </section>

        {/* ── Three tiers as a ledger, not identical rounded cards ── */}
        <section aria-labelledby="tiers-heading" className="section-y">
          <div className="frame">
            <h2 id="tiers-heading" className="sr-only">
              Plans
            </h2>
            <ol className="border-t-2 border-foreground">
              {TIERS.map((tier) => (
                <li
                  key={tier.id}
                  id={tier.id}
                  className="grid scroll-mt-20 gap-6 border-b border-border py-9 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
                >
                  <div className="min-w-0">
                    <p className="label-mono">{tier.name}</p>
                    <p className="display mt-2 text-[1.9rem] leading-none">
                      {tier.price}
                      <span className="ml-1.5 text-sm font-sans font-normal text-muted-foreground">
                        {tier.cadence}
                      </span>
                    </p>
                    {tier.id !== "free" && !openFor[tier.id] ? (
                      <p className="redline-note mt-3 uppercase tracking-[0.1em]">
                        Not open yet. This is the launch price.
                      </p>
                    ) : null}

                    <div className="mt-5">
                      {tier.id === "free" ? (
                        <Link href="/grade" className={OUTLINE_CTA}>
                          Run a free grade
                        </Link>
                      ) : null}
                      {tier.id === "solo" ? (
                        soloOpen ? (
                          <StartSoloPlanButton className={PRIMARY_CTA} />
                        ) : (
                          <Link href="/for-agencies#early-access" className={OUTLINE_CTA}>
                            Request access
                          </Link>
                        )
                      ) : null}
                      {tier.id === "agency" ? (
                        foundingOpen ? (
                          <UnlockFoundingAccessButton className={PRIMARY_CTA} label="Unlock founding access" />
                        ) : (
                          <Link href="/for-agencies#early-access" className={OUTLINE_CTA}>
                            Request founding access
                          </Link>
                        )
                      ) : null}
                    </div>

                    {tier.id !== "free" && openFor[tier.id] && trialDays > 0 ? (
                      <p className="mt-3 max-w-[13rem] text-xs leading-relaxed text-muted-foreground">
                        Starts with a {trialDays}-day free trial. A card is collected up front;
                        cancel from Settings before it ends and you are not charged.
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="max-w-md leading-relaxed text-muted-foreground">{tier.who}</p>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex min-w-0 gap-2 text-sm leading-relaxed">
                          <span aria-hidden="true" className="mt-0.5 text-muted-foreground">
                            +
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                      {tier.limits}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What runs today vs the roadmap, in the open ── */}
        <section aria-labelledby="capability-heading" className="border-y border-border bg-card section-y">
          <div className="frame">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <h2 id="capability-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                What runs today. What&apos;s still the roadmap.
              </h2>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground lg:justify-self-end">
                No plan page should need a footnote to be honest. Here is the whole list, with
                the one gap named plainly: hosted behind-login scanning does not exist yet.
              </p>
            </div>

            <div
      tabIndex={0}
      role="region"
      aria-label="Capabilities by status table"
      className="mt-10 min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="sr-only">Capabilities available today versus on the roadmap</caption>
                <thead>
                  <tr className="border-b-2 border-foreground">
                    <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                      Capability
                    </th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="py-2 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                      Where
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_LEDGER.map((row) => (
                    <tr key={row.capability} className="border-b border-border">
                      <th scope="row" className="py-3 pr-4 font-normal">
                        {row.capability}
                      </th>
                      <td className="py-3 pr-4 font-mono text-xs uppercase tracking-[0.08em]">
                        {row.today ? (
                          <span>Today</span>
                        ) : (
                          <span className="text-[var(--redline)]">Roadmap</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Why $199 beats an enterprise contract, and why free tools aren't enough ── */}
        <section aria-labelledby="anchor-heading" className="section-y">
          <div className="frame grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <div>
              <p className="label-mono">Compared to the alternatives</p>
              <h2 id="anchor-heading" className="display mt-3 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                Cheaper than enterprise. Steadier than free.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Enterprise accessibility platforms in the class of Deque axe, Siteimprove, Level Access,
                and Evinced are typically sold on annual contracts running{" "}
                <span className="font-medium text-foreground">five figures a year</span>. Mid-market
                tools land lower: Pope Tech around $2,000/year, Silktide around $6,000/year.
                Agency founding access is $199 a month, no sales call.
              </p>
            </div>
            <div className="sheet min-w-0 p-6 sm:p-8">
              <p className="label-mono">Free tools, and where they stop</p>
              <p className="mt-3 max-w-md font-serif text-[1.0625rem] leading-relaxed">
                WAVE, Lighthouse CI, and pa11y-ci are free and worth running. None of them key a
                defect to a <span className="mark">render-stable id</span>, so a framework that
                regenerates element ids on every build makes their baselines noisy on real
                codebases. The CI gate starts crying wolf and teams turn it off.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Personaudit&apos;s baseline survives that churn: the same broken component reads
                as the same finding across builds, cited to{" "}
                <WcagCitation code="4.1.2" />, not a rotating DOM id.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section aria-labelledby="faq-heading" className="border-t border-border bg-card section-y">
          <div className="frame-narrow">
            <p className="label-mono">Questions</p>
            <h2 id="faq-heading" className="display mt-3 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              The questions a serious buyer actually asks.
            </h2>
            <div className="mt-10 border-t border-border">
              {PRICING_FAQS.map((faq) => (
                <details key={faq.question} className="group border-b border-border py-6">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm font-medium [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
                    <span>{faq.question}</span>
                    <span aria-hidden="true" className="mt-0.5 shrink-0 font-mono text-muted-foreground">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="mt-2.5 leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
              Reading the CLI docs first is the sane order:{" "}
              <Link href="/docs" className="text-link">
                install and first scan
              </Link>
              . Shipping client sites?{" "}
              <Link href="/for-agencies" className="text-link">
                See the agency workspace
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
