import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Screen Reader Testing Guide",
  description: "How to test your website with screen readers. Covers VoiceOver, NVDA, and JAWS with common issues and automated alternatives.",
};

const screenReaders = [
  {
    name: "VoiceOver",
    platform: "macOS / iOS",
    free: true,
    setup: "System Settings > Accessibility > VoiceOver. Or press Cmd+F5.",
    keyCommands: "VO keys = Ctrl+Option. Navigate: VO+Right Arrow. Activate: VO+Space.",
  },
  {
    name: "NVDA",
    platform: "Windows",
    free: true,
    setup: "Download from nvaccess.org. Install and press Caps Lock or Insert as modifier.",
    keyCommands: "Navigate: Tab / Arrow keys. Read page: NVDA+Down Arrow. Elements list: NVDA+F7.",
  },
  {
    name: "JAWS",
    platform: "Windows",
    free: false,
    setup: "Licensed software from Freedom Scientific. Industry standard for enterprise testing.",
    keyCommands: "Navigate: Tab / Arrow keys. Virtual cursor: Insert+F7 for links list.",
  },
];

const whatToTest = [
  { check: "Page title announced correctly", why: "First thing a screen reader user hears. Must identify the page." },
  { check: "Headings create navigable outline", why: "Users jump between headings to scan content — like visual scanning." },
  { check: "Images described or skipped", why: "Meaningful images need alt text. Decorative images should be hidden." },
  { check: "Forms are labeled and error messages announced", why: "Users need to know what each field is for and what went wrong." },
  { check: "Links and buttons have descriptive text", why: "'Click here' is meaningless when links are listed out of context." },
  { check: "Dynamic content announced", why: "Toasts, alerts, and live updates need aria-live regions." },
  { check: "Focus management in modals", why: "Opening a modal must move focus into it. Closing must return focus." },
  { check: "Tables have headers", why: "Screen readers use <th> to announce context for each cell." },
];

export default function ScreenReaderTestingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight font-heading">Screen Reader Testing Guide</h1>
      <p className="mt-4 text-muted-foreground">
        Testing with a real screen reader — ideally with disabled testers — is the gold
        standard for accessibility validation. Nothing automated replaces it. Here&apos;s how
        to do it, and where automated tooling can clear the deterministic issues first.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Screen readers to use</h2>
      <div className="mt-4 grid gap-4">
        {screenReaders.map((sr) => (
          <div key={sr.name} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium">{sr.name}</h3>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{sr.platform}</span>
              {sr.free && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Free</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{sr.setup}</p>
            <p className="mt-1 text-sm text-muted-foreground"><strong className="text-foreground">Key commands:</strong> {sr.keyCommands}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">What to check</h2>
      <div className="mt-4 space-y-3">
        {whatToTest.map((item) => (
          <div key={item.check} className="rounded-lg border border-border p-4">
            <h3 className="font-medium">{item.check}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h2 className="text-lg font-semibold">Clear the automatable issues first</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Personaudit does <strong>not</strong> simulate a screen reader user. It drives your
          site keyboard-only and runs axe-core at every state it reaches — including flows behind
          your login — so the deterministic violations are fixed before your manual screen-reader
          pass. It complements that pass; it never replaces it.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Run a free audit
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
