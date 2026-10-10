import { Fragment } from "react";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";
import { CHANGELOG, CHANGELOG_PR_BASE, type ChangelogEntry } from "@/lib/changelog";

export const metadata: Metadata = {
  alternates: { canonical: "/changelog" },
  title: "Changelog",
  description: "User-visible changes to Personaudit, by month, taken from merged pull requests.",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-10-09" -> "9 October 2026". Parsed by hand so the output never depends on locale or timezone. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${monthName(m)} ${y}`;
}

function monthName(m: number | undefined): string {
  return MONTHS[(m ?? 1) - 1] ?? "";
}

function groupByMonth(entries: ChangelogEntry[]): { id: string; label: string; items: ChangelogEntry[] }[] {
  const groups: { id: string; label: string; items: ChangelogEntry[] }[] = [];
  for (const entry of entries) {
    const [y, m] = entry.date.split("-").map(Number);
    const id = `${y}-${String(m ?? 0).padStart(2, "0")}`;
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.items.push(entry);
    } else {
      groups.push({ id, label: `${monthName(m)} ${y}`, items: [entry] });
    }
  }
  return groups;
}

export default function ChangelogPage() {
  const months = groupByMonth(CHANGELOG);

  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Changelog"
        title="What changed in Personaudit"
        mark="What changed"
        lastReviewed="10 October 2026"
        toc={months.map((g) => ({ id: g.id, label: g.label }))}
      >
        <p>
          User-visible changes, newest first, taken from merged pull requests. Dependency
          updates and internal changes are left out. Each entry links to its pull request.
        </p>

        {months.map((g) => (
          <Fragment key={g.id}>
            <h2 id={g.id}>{g.label}</h2>
            <ul>
              {g.items.map((e) => (
                <li key={`${e.pr}-${e.date}`}>
                  <time dateTime={e.date}>{formatDate(e.date)}</time>: {e.text}{" "}
                  <a
                    href={`${CHANGELOG_PR_BASE}/${e.pr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    #{e.pr}
                  </a>
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </ContentArticle>
    </MarketingShell>
  );
}
