import { siteKey } from "@/lib/grade-share";

export type ProjectPrefill = { name: string; url: string };

/**
 * Converts a graded public URL into editable project defaults. Invalid query input is
 * discarded instead of being reflected into the form.
 */
export function projectPrefill(value: string | null): ProjectPrefill | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return {
      name: url.hostname.replace(/^www\./, ""),
      url: url.href,
    };
  } catch {
    return null;
  }
}

type SavedProject = { id: string; name: string; url: string };

export type ProjectOffer =
  | { kind: "none" }
  | { kind: "create"; prefill: ProjectPrefill }
  /** The site is already a project of this account. */
  | { kind: "exists"; project: SavedProject }
  /** The plan's project cap is reached, so a new project would be refused. */
  | { kind: "limit"; limit: number; project: SavedProject };

/**
 * What the Projects page offers for a graded URL: a one-click create when it can succeed,
 * otherwise the plain reason and the project to open instead. `limit` is the plan's cap
 * (null = uncapped), the same value `createProjectAction` enforces.
 */
export function projectOffer(
  prefill: ProjectPrefill | null,
  projects: SavedProject[],
  limit: number | null,
): ProjectOffer {
  if (!prefill) return { kind: "none" };
  const key = siteKey(prefill.url);
  const same = projects.find((p) => siteKey(p.url) === key);
  if (same) return { kind: "exists", project: same };
  if (limit !== null && projects.length >= limit && projects[0]) {
    return { kind: "limit", limit, project: projects[0] };
  }
  return { kind: "create", prefill };
}
