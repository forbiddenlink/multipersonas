import type { ReactNode } from "react";
import Link from "next/link";
import { BatesSerial } from "@/components/dossier/exhibit-head";
import { Wordmark } from "@/components/forensic/wordmark";

const REASONS = [
  {
    n: "1",
    title: "Free grades, saved",
    body: "Grades you run while signed in are kept on your account, so you can find them again.",
  },
  {
    n: "2",
    title: "1 project to track a site",
    body: "Free includes 1 project. Its grades sit together so you can watch one site over time.",
  },
  {
    n: "3",
    title: "The CLI and CI gate",
    body: "Scan behind a login on your own machine and fail builds only on new defects. Free, account or not.",
  },
  {
    n: "4",
    title: "More, on Solo and up",
    body: "Solo and up add scans inside projects, persona task-success runs, retest compare and report export.",
  },
] as const;

/** The password-reset path, in order. Shown instead of the sign-in reasons on the reset pages. */
export const RESET_STEPS = [
  { n: "1", title: "Enter your account email", body: "Use the address you signed up with." },
  { n: "2", title: "Open the reset link", body: "We email a link to that address." },
  { n: "3", title: "Choose a new password", body: "Then sign in as usual." },
] as const;

/**
 * Split layout for every /auth/* page. Left: the form sheet (children), which
 * carries its own CardHeaderBar + fields — this component only supplies the
 * frame. Right (lg+): the reason to have an account at all. Mobile: form only,
 * top of the page, no reasons column.
 */
export function AuthShell({
  children,
  reasonsTitle = "Why sign in",
  reasons = REASONS,
  serial = "0007",
}: {
  children: ReactNode;
  reasonsTitle?: string;
  reasons?: readonly { n: string; title: string; body: string }[];
  /** Bates serial for this page, so each auth page carries its own number. */
  serial?: string;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col items-center justify-start px-4 py-8 sm:px-6 lg:pt-[14vh]">
        <div className="mb-6 flex w-full max-w-md items-baseline justify-between lg:hidden">
          <Wordmark className="text-foreground" />
          <BatesSerial n={serial} />
        </div>
        {children}
      </div>

      <div className="hidden border-l border-border bg-card lg:flex lg:flex-col lg:justify-start lg:px-14 lg:pt-[14vh] xl:px-20">
        <div className="max-w-sm">
          <Wordmark className="text-foreground" />
          <p className="label-mono mt-8">{reasonsTitle}</p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {reasons.map((r) => (
              <li key={r.n} className="flex gap-4 py-4">
                <span className="display shrink-0 text-lg leading-none text-muted-foreground">
                  {r.n}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-l-2 border-foreground pl-4 text-sm leading-relaxed text-muted-foreground">
            Scans you run in the CLI never upload your login session. What we keep, and for how
            long, is in the{" "}
            <Link href="/privacy" className="text-link">
              privacy policy
            </Link>
            .
          </p>
          <BatesSerial n={serial} className="mt-6 block text-right" />
        </div>
      </div>
    </div>
  );
}

/** Sheet-top route label: the auth card as a document, not a terminal window. */
export function AuthCardTab({ route }: { route: string }) {
  return (
    <div className="file-tab">
      <span>Personaudit</span>
      <span className="text-muted-foreground">·</span>
      <span>{route}</span>
    </div>
  );
}

/** Redline inline error — DESIGN.md "error in redline with a ■ glyph and role=alert". */
export function AuthFormError({ id, message }: { id?: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-sm border border-[color-mix(in_oklch,var(--redline)_45%,transparent)] bg-[color-mix(in_oklch,var(--redline)_8%,transparent)] px-3 py-2 text-sm text-[var(--redline)]"
    >
      <span aria-hidden="true">■ </span>
      {message}
    </p>
  );
}
