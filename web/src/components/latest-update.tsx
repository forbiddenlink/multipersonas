import Link from "next/link";
import { latestUpdate } from "@/lib/latest-update";

/** One quiet dated line from the newest changelog entry. Renders nothing when that entry is stale. */
export function LatestUpdate({ className = "" }: { className?: string }) {
  const update = latestUpdate();
  if (!update) return null;
  return (
    <p className={`text-sm leading-relaxed text-muted-foreground ${className}`}>
      <Link href={`/changelog#${update.id}`} className="text-link">
        <span className="font-mono">{update.date}</span>: {update.text}
      </Link>
    </p>
  );
}
