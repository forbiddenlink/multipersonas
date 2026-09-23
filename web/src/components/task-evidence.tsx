import Link from "next/link";
import { parseTaskDefinition, parseTaskOutcomes, taskEvidenceLabel, taskCheckDetails } from "@engine/tasks/definition";
import { PERSONA_DATA } from "@/lib/personas";

export function TaskEvidencePanel({ task, outcomes, runId }: {
  task: unknown;
  outcomes: unknown;
  runId?: string;
}) {
  const definition = parseTaskDefinition(task);
  if (!definition) return null;
  const results = parseTaskOutcomes(definition, outcomes);
  return (
    <section aria-label="Saved task result" className="space-y-3 rounded-md border border-border p-4">
      <h2 className="text-lg font-semibold">Task tested</h2>
      <p className="text-sm">{definition.goal}</p>
      <p className="text-sm text-muted-foreground">Expected visible text: <q>{definition.successText}</q></p>
      {definition.version === 2 && definition.expectedUrl && <p className="break-all text-sm">Expected final URL: {definition.expectedUrl}</p>}
      {definition.version === 2 && definition.requireNewText && <p className="text-sm">Text must be absent at the start and visible at the end.</p>}
      {results.length ? (
        <ul className="space-y-2 text-sm">
          {results.map(({ personaId, evidence }) => (
            <li key={personaId}>
              <span className="font-medium">{PERSONA_DATA[personaId as keyof typeof PERSONA_DATA]?.name ?? personaId}</span>
              {": "}{taskEvidenceLabel(definition, evidence)}
              {evidence.checks && <p className="text-xs text-muted-foreground">{taskCheckDetails(evidence)}</p>}
              {runId && evidence.stepIndex !== null ? (
                <Link className="ml-2 underline underline-offset-4" href={`/audits/${runId}?persona=${encodeURIComponent(personaId)}&evidence=task`}>
                  View evidence
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm">No task evidence was saved for this run.</p>}
      <p className="text-xs text-muted-foreground">
        Checks exact visible text on the final page and any additional checks saved with this task. This does not prove a transaction completed or predict a real person&apos;s success.
        Missing text may mean the agent could not find it; it does not prove the site is broken.
      </p>
    </section>
  );
}
