import type { ReactNode } from "react";
import { BatesSerial } from "@/components/dossier/exhibit-head";
import { Wordmark } from "@/components/forensic/wordmark";

const REASONS = [
  {
    n: "1",
    title: "Every audit, kept",
    body: "Axe verdicts and persona runs land in your history automatically. Nothing to export by hand.",
  },
  {
    n: "2",
    title: "Projects, not one-off scans",
    body: "Group runs by client site so a scan history and re-runs stay together.",
  },
  {
    n: "3",
    title: "Compare a retest",
    body: "Run it again after a fix ships and see exactly what cleared, side by side.",
  },
  {
    n: "4",
    title: "A report to hand over",
    body: "Findings and persona notes, kept apart, ready to put in front of a client.",
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
      <div className="flex flex-col items-center justify-start px-4 py-8 sm:px-6 lg:pt-28">
        <div className="mb-6 flex w-full max-w-md items-baseline justify-between lg:hidden">
          <Wordmark className="text-foreground" />
          <BatesSerial n={serial} />
        </div>
        {children}
      </div>

      <div className="hidden border-l border-border bg-card lg:flex lg:flex-col lg:justify-start lg:px-14 lg:pt-28 xl:px-20">
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
