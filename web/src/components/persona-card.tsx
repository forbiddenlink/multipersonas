import type { Persona } from "@engine/personas/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const avatarColors = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-orange-600",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function TechDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Tech</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block size-2 rounded-full ${
            i < level ? "bg-foreground" : "bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

const connectionLabels: Record<string, string> = {
  fast: "Fast",
  "3g": "3G",
  "slow-3g": "Slow 3G",
};

const patienceLabels: Record<string, string> = {
  low: "Impatient",
  medium: "Moderate",
  high: "Patient",
};

export function PersonaCard({ persona }: { persona: Persona }) {
  const colorIndex = hashString(persona.id) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white font-semibold text-lg ${avatarColor}`}
          >
            {persona.name[0]}
          </div>
          <div className="min-w-0">
            <CardTitle>{persona.name}</CardTitle>
            <CardDescription className="mt-0.5 line-clamp-2 capitalize">
              {persona.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <TechDots level={persona.techProficiency} />

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {persona.isMobile ? "Mobile" : "Desktop"}
          </Badge>
          <Badge variant="secondary">
            {connectionLabels[persona.connectionSpeed]}
          </Badge>
          <Badge variant="outline">{patienceLabels[persona.patienceLevel]}</Badge>
          <Badge variant="outline">{persona.maxSteps} steps</Badge>
          {persona.accessibilityNeeds.map((need) => (
            <Badge key={need} variant="destructive">
              {need}
            </Badge>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Goals</p>
          <ul className="list-disc list-inside text-sm text-foreground/80 space-y-0.5">
            {persona.goals.slice(0, 2).map((goal) => (
              <li key={goal} className="line-clamp-1">
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
