import { prebuiltPersonas } from "@engine/personas/prebuilt";
import { PERSONA_DATA, type PersonaId } from "@/lib/personas";
import { SAMPLE_PANE_PAGE, SAMPLE_PANE_PERSONAS } from "@/lib/sample-evidence";
import {
  EXAMPLE_FAULT_ID,
  EXAMPLE_PAGE,
  exampleGrade,
  outlineLines,
  tabOrder,
  type ExampleNode,
} from "@/lib/example-page";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { describeDevice } from "@/lib/persona-outcomes";

type ViewKind = "normal" | "keyboard" | "outline" | "narrow";

/** One persona, one way of looking at the same example page. */
const VIEW: Record<(typeof SAMPLE_PANE_PERSONAS)[number], { kind: ViewKind; label: string; alt: string }> = {
  "first-time-visitor": {
    kind: "normal",
    label: "Normal view",
    alt: "The example checkout page as a first-time visitor sees it: a heading, three fields, an error message with a dismiss button that has no name, and Cancel and Continue.",
  },
  "keyboard-traversal": {
    kind: "keyboard",
    label: "Focus order",
    alt: "The same page with the Tab order drawn on it: first name 1, last name 2, postal code 3, the unnamed dismiss button 4, Cancel 5, Continue 6.",
  },
  "ai-agent-visitor": {
    kind: "outline",
    label: "Page as text",
    alt: "The same page as the text outline the agent reads. The dismiss button appears as a bare button with no name.",
  },
  "mobile-slow-connection": {
    kind: "narrow",
    label: "375 px wide",
    alt: "The same page at 375 pixels wide, as a phone on a slow connection loads it.",
  },
};

/** What the persona actually does differently, from its own definition. */
function modalityLabel(id: PersonaId): string {
  return describeDevice(prebuiltPersonas[id]!);
}

function FocusBadge({ n, fault = false, beside = false }: { n: number; fault?: boolean; beside?: boolean }) {
  // `beside` puts the badge after a text target instead of on its corner, so it never covers a letter.
  const place = beside ? "top-1/2 -right-6 -translate-y-1/2" : "-top-2 -right-1";
  return (
    <span
      className={`absolute ${place} z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background px-1 font-mono text-[13px] font-bold leading-none tabular-nums ${
        fault ? "bg-[var(--redline)] text-background" : "bg-foreground text-background"
      }`}
    >
      {n}
    </span>
  );
}

/** The example page, drawn small. `badges` adds the Tab order; `narrow` is the phone width. */
function ExampleForm({ badges = false }: { badges?: boolean }) {
  const order = tabOrder();
  const byId = (id: string): ExampleNode => EXAMPLE_PAGE.nodes.find((n) => n.id === id)!;
  const badge = (id: string, beside = false) =>
    badges ? <FocusBadge n={order.get(id)!} fault={id === EXAMPLE_FAULT_ID} beside={beside} /> : null;
  const focused = (id: string) => (badges && order.get(id) === 1 ? "outline-[3px] outline-offset-2 outline-[var(--ring)]" : "");

  const field = (id: string) => {
    const node = byId(id);
    return (
      <div key={id}>
        <p className="text-[13px] font-bold leading-tight">{node.name}</p>
        <div
          className={`relative mt-0.5 h-5 border-2 bg-background ${node.invalid ? "border-[var(--redline)]" : "border-foreground"} ${focused(id)}`}
        >
          {badge(id)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 p-2.5">
      <p className="text-[13px] font-extrabold leading-tight">{byId("title").name}</p>
      {field("first")}
      {field("last")}
      {field("postal")}
      <div className="flex items-center justify-between gap-1 border-2 border-[var(--redline)] px-1.5 py-1">
        <span className="text-[13px] font-bold leading-tight text-[var(--redline)]">{byId("error").text}</span>
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center border-2 border-dashed border-[var(--redline)] text-[13px] font-bold leading-none text-[var(--redline)]">
          ×{badge(EXAMPLE_FAULT_ID)}
        </span>
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <span className="relative text-[12px] font-bold underline decoration-2 underline-offset-2">
          Cancel{badge("cancel", true)}
        </span>
        <span className="relative bg-primary px-3 py-0.5 text-[12px] font-bold text-primary-foreground">
          Continue{badge("continue")}
        </span>
      </div>
    </div>
  );
}

function Outline() {
  return (
    <ul className="space-y-1 p-2.5 font-mono text-[11.5px] leading-snug">
      {outlineLines().map((line) => (
        <li
          key={line.text}
          className={`break-words ${line.fault ? "bg-[color-mix(in_oklch,var(--redline)_12%,transparent)] px-1.5 font-bold text-[var(--redline)]" : "px-1.5"}`}
        >
          {line.text}
          {line.fault ? <span className="block text-[13px] font-bold">no accessible name</span> : null}
        </li>
      ))}
    </ul>
  );
}

function PageChrome({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={`${narrow ? "mx-auto w-[58%] min-w-[9.5rem]" : "w-full"} border-2 border-foreground bg-background`}>
      <div className="border-b-2 border-foreground bg-muted px-2 py-0.5 font-mono text-[10.5px] leading-tight">
        {narrow ? EXAMPLE_PAGE.host : EXAMPLE_PAGE.host + EXAMPLE_PAGE.path}
      </div>
      {children}
    </div>
  );
}

function View({ kind }: { kind: ViewKind }) {
  if (kind === "outline") {
    return <Outline />;
  }
  if (kind === "narrow") {
    return (
      <PageChrome narrow>
        <ExampleForm />
      </PageChrome>
    );
  }
  return (
    <PageChrome>
      <ExampleForm badges={kind === "keyboard"} />
    </PageChrome>
  );
}

/**
 * The signature object: one example page, seen by each persona the engine really has,
 * side by side, with the overall letter grade under it. Persona names, roles and viewports
 * come from the engine's definitions. The example page is a small static page in
 * `lib/example-page.ts`, labelled as an example; the finding on it is the real SauceDemo
 * probe result for that state, and the letter comes from the engine's own scorer.
 *
 * These are not disability simulations. The AI agent visitor reads a text outline of the
 * page; it is not a screen reader, and nothing here claims what a person using one hears.
 * Below `lg` the panels scroll sideways inside a named, focusable region.
 */
export function PersonaLineup({ className = "" }: { className?: string }) {
  const finding = SAMPLE_PANE_PAGE.findings[0];
  const grade = exampleGrade();
  const cap = grade.cappedBy;

  return (
    <figure className={className} aria-labelledby="lineup-caption">
      <figcaption id="lineup-caption" className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="text-xl font-extrabold">Example page, sample grade</span>
        <span className="text-base text-muted-foreground">
          One small page, four personas. Not a scan of a real site.
        </span>
      </figcaption>

      <div
        role="region"
        tabIndex={0}
        aria-label="Persona panels, scroll sideways"
        className="relative mt-3 min-w-0 overflow-x-auto pb-3 lg:overflow-visible lg:pb-0"
      >
        <ul className="flex snap-x gap-4 lg:grid lg:grid-cols-4">
          {SAMPLE_PANE_PERSONAS.map((id) => {
            const persona = PERSONA_DATA[id];
            const view = VIEW[id];
            return (
              <li
                key={id}
                aria-label={`${persona.name}, ${persona.role}`}
                className="flex w-[17rem] shrink-0 snap-start flex-col border-[3px] border-foreground bg-card lg:w-auto"
              >
                <div className="bg-foreground px-3 py-2 text-background">
                  <p className="text-lg font-extrabold leading-tight">{persona.name}</p>
                  <p className="text-sm leading-snug">{persona.role}</p>
                  <p className="mt-0.5 font-mono text-xs leading-snug">{modalityLabel(id)}</p>
                </div>
                <p className="border-b-2 border-foreground px-3 py-1 text-[13px] font-bold">
                  {view.label}
                </p>
                <div className="min-h-[17.5rem] flex-1 overflow-hidden bg-muted p-2" aria-hidden="true">
                  <View kind={view.kind} />
                </div>
                <p className="sr-only">{view.alt}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-foreground px-3 py-2">
                  <SeverityChip severity={finding.severity} ruleId={finding.wcag} />
                  <span className="font-mono text-sm font-bold tabular-nums">1 issue</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 grid items-center gap-x-10 gap-y-4 border-[3px] border-foreground bg-foreground text-background sm:grid-cols-[auto_minmax(0,1fr)]">
        <p className="sr-only">Sample grade: {grade.grade}</p>
        <span
          aria-hidden="true"
          className="display px-8 text-center text-[clamp(9rem,22vw,17rem)] leading-[0.82] tracking-[-0.04em] sm:py-3 sm:pr-4"
        >
          {grade.grade}
        </span>
        <div className="space-y-3 px-5 pb-6 sm:py-6 sm:pl-0 sm:pr-8">
          <p className="text-sm font-bold">Sample grade</p>
          <p className="max-w-xl text-2xl font-extrabold leading-snug sm:text-3xl">
            {cap
              ? `One critical failure caps the letter at ${cap.maxGrade}, however many other checks pass.`
              : `This example page earns a ${grade.grade}.`}
          </p>
          <p className="max-w-xl leading-relaxed">{SAMPLE_PANE_PAGE.findingNote}</p>
        </div>
      </div>
    </figure>
  );
}
