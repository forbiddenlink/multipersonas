import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { BoxDivider } from "@/components/forensic/divider";
import { JsonLd, faqSchema } from "@/components/json-ld";
import { StartSoloPlanButton } from "@/components/start-solo-plan-button";
import { UnlockFoundingAccessButton } from "@/components/unlock-founding-access-button";
import { isFoundingCheckoutOpen, isSoloCheckoutOpen } from "@/lib/founding-checkout";
import { PROJECT_LIMITS } from "@/lib/entitlements";
import { trialPeriodDays } from "@/lib/plans";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — free CLI, hosted workspace from $39",
  description:
    "The keyless CLI and the CI accessibility gate are free forever. Hosted projects, scheduled re-scans and persona task-success start at $39/month. Agency access adds white-label reports.",
};

const CTA =
  "inline-flex w-full items-center justify-center rounded-sm px-5 py-3 font-mono text-xs uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";
const CTA_PRIMARY = `${CTA} bg-primary text-primary-foreground hover:bg-primary/90`;
const CTA_QUIET = `${CTA} border border-border hover:border-foreground/20 hover:text-foreground`;

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  who: string;
  features: string[];
  /** Stated plainly on the card, because the gap is the reason to trust the rest. */
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
      "The CLI, keyless — `scan` needs no API key",
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
      "Money back if hosted behind-login never ships",
    ],
    limits: "Hosted behind-login scanning is not built yet. It is what this funds.",
  },
];

const PRICING_FAQS = [
  {
    question: "Is the CLI really free?",
    answer:
      "Yes, and it is the part that does the compliance work. `scan` runs axe-core with no API key and no account, including behind a login using a session saved on your own machine. Paying is for the hosted workspace around it: history, schedules, and the exported report.",
  },
  {
    question: "Do you scan behind a login on your servers?",
    answer:
      "No. Behind-login scanning runs in the CLI on your machine, so a client password never leaves your laptop. Hosted behind-login is not built. Agency founding access is what funds it, and if it never ships you get your money back.",
  },
  {
    question: "What happens when the trial ends?",
    answer:
      "The card you entered is charged for the first month. Cancel any time before then from Settings and you are not billed. Your CLI keeps working either way, because it never depended on the subscription.",
  },
  {
    question: "What counts as a project?",
    answer:
      "One site under audit, with its scans, baseline, and history over time. Free includes one so the workspace is genuinely try-able; Solo includes five; agency access is unlimited.",
  },
  {
    question: "Does a persona decide whether my site is accessible?",
    answer:
      "Never. Only axe-core touches compliance, and it is deterministic and citable. Personas report task success and labeled opinion. We do not simulate disabled users, and nothing here replaces testing with them.",
  },
];

export default function PricingPage() {
  const soloOpen = isSoloCheckoutOpen();
  const foundingOpen = isFoundingCheckoutOpen();
  const openFor: Record<string, boolean> = { free: true, solo: soloOpen, agency: foundingOpen };
  const trialDays = trialPeriodDays();

  return (
    <MarketingShell narrow={false}>
      <JsonLd data={faqSchema(PRICING_FAQS)} />

      <section className="mx-auto w-full max-w-6xl px-6 section-y">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          The part that proves compliance is free.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
          The CLI runs axe-core at every state it reaches, including behind a login, with no
          API key and no account. You pay when you want that evidence kept, scheduled, and
          exportable for a client — not for the scan itself.
        </p>

        <BoxDivider label="plans" className="mt-10 mb-6" />

        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              id={tier.id}
              className="flex flex-col rounded-md border border-border bg-card p-6"
            >
              <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {tier.name}
              </h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.cadence}</span>
              </p>
              {/* Never present a price as buyable when checkout cannot take payment.
                  Same rule the agency page follows, enforced by honesty-copy.test.ts. */}
              {tier.id !== "free" && !openFor[tier.id] ? (
                <p className="mt-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Not open yet — the price is what it will be
                </p>
              ) : null}
              <p className="mt-3 text-sm text-muted-foreground">{tier.who}</p>

              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="text-muted-foreground">
                      +
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                {tier.limits}
              </p>

              <div className="mt-6">
                {tier.id === "free" ? (
                  <Link href="/grade" className={CTA_QUIET}>
                    Run a free grade
                  </Link>
                ) : null}

                {tier.id === "solo" ? (
                  soloOpen ? (
                    <StartSoloPlanButton className={CTA_PRIMARY} />
                  ) : (
                    <Link href="/for-agencies#early-access" className={CTA_QUIET}>
                      Tell us to open this tier
                    </Link>
                  )
                ) : null}

                {tier.id === "agency" ? (
                  foundingOpen ? (
                    <UnlockFoundingAccessButton className={CTA_PRIMARY} />
                  ) : (
                    <Link href="/for-agencies#early-access" className={CTA_QUIET}>
                      Request founding access
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {trialDays > 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Both paid plans start with a {trialDays}-day free trial. A card is collected up
            front so the plan continues without an interruption; cancel before the trial ends
            from Settings and you are not charged.
          </p>
        ) : null}

        <BoxDivider label="questions" className="mt-12 mb-6" />

        <dl className="max-w-3xl space-y-6">
          {PRICING_FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-muted-foreground">
          Reading the CLI docs first is the sane order:{" "}
          <Link
            href="/docs"
            className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            install and first scan
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}
