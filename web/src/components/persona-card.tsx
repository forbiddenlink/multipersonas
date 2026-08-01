import type { Persona } from "@engine/personas/types";
import { Monogram } from "@/components/forensic/monogram";

// Instrument-panel persona card: monogram tile (deterministic, severity-free) +
// mono label/value readout rows instead of colorful badges. Personas are a UX
// opinion layer, never a compliance verdict — no severity tint here.

const connectionLabels: Record<string, string> = {
  fast: "Fast",
  "3g": "3G",
  "slow-3g": "Slow 3G",
};

const patienceLabels: Record<string, string> = {
  low: "Low",
  medium: "Moderate",
  high: "High",
};

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs tabular-nums text-card-foreground">{value}</span>
    </div>
  );
}

export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <Monogram name={persona.name} size={40} />
        <div className="min-w-0">
          <p className="font-medium text-card-foreground">{persona.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm capitalize text-muted-foreground">
            {persona.description}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/60 px-4">
        <Readout label="Tech" value={`${persona.techProficiency} / 5`} />
        <Readout label="Device" value={persona.isMobile ? "Mobile" : "Desktop"} />
        <Readout label="Connection" value={connectionLabels[persona.connectionSpeed] ?? persona.connectionSpeed} />
        <Readout label="Patience" value={patienceLabels[persona.patienceLevel] ?? persona.patienceLevel} />
        <Readout
          label="Input"
          value={persona.inputModality === "keyboard" ? "Keyboard only" : "Pointer"}
        />
        <Readout label="Steps" value={`${persona.maxSteps}`} />
      </div>

      <div className="p-4 pt-3">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          Goals
        </p>
        <ul className="mt-1.5 space-y-0.5 text-sm text-card-foreground/80">
          {persona.goals.slice(0, 2).map((goal) => (
            <li
              key={goal}
              className="line-clamp-1 before:mr-1.5 before:text-muted-foreground/50 before:content-['·']"
            >
              {goal}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
