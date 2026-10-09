import { scanCoverageLines, type ScanCoverage } from "@/lib/scan-coverage";

export function ScanCoveragePanel({ coverage }: { coverage?: ScanCoverage | null }) {
  return (
    <section aria-label="Scan coverage" className="space-y-2">
      <h2 className="text-sm font-semibold">Scan coverage</h2>
      {scanCoverageLines(coverage).map((line, index) => (
        <p key={index} className="break-words text-sm">{line}</p>
      ))}
    </section>
  );
}
