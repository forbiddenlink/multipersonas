import { SAMPLE_TARGET } from "@/lib/sample-evidence";

/**
 * Cover sheet for the sample client report. Scope and engine version are grounded facts
 * (not invented): the probe source lives in `experiments/net-new-violations`, and the
 * axe-core version is read from the workspace lockfile — see the comment at its call site.
 */
export function SampleCoverSheet({ axeVersion, preparedOn }: { axeVersion: string; preparedOn: string }) {
  return (
    <header className="border-b-2 border-foreground pb-6">
      <p className="label-mono">Accessibility evidence report · sample</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.05]">
        <span className="mark-sweep">{SAMPLE_TARGET.host}</span>
      </h1>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="label-mono">Client</dt>
          <dd className="mt-1 font-mono text-sm">Sample only</dd>
        </div>
        <div>
          <dt className="label-mono">Prepared</dt>
          <dd className="mt-1 font-mono text-sm">{preparedOn}</dd>
        </div>
        <div>
          <dt className="label-mono">Scope</dt>
          <dd className="mt-1 font-mono text-sm">Public + signed-in</dd>
        </div>
        <div>
          <dt className="label-mono">Engine</dt>
          <dd className="mt-1 font-mono text-sm">axe-core {axeVersion}</dd>
        </div>
      </dl>
    </header>
  );
}
