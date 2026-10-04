import type { ClaimedGrade } from "@/lib/grade";
import { gradesForSite, regradePath } from "@/lib/grade-share";

export interface FirstRunStep {
  label: string;
  done: boolean;
  /** Where the next action for this step lives. */
  href: string;
  action: string;
}

/**
 * The three steps of the Free first run, each marked done from the account's own data:
 * a grade, a project, and two grades of a project's site (a re-grade after a fix).
 * Newest grade first, as `listGraderScansForUser` returns them.
 */
export function firstRunSteps({
  grades,
  projects,
}: {
  grades: ClaimedGrade[];
  projects: { url: string }[];
}): FirstRunStep[] {
  const regradeProject = projects.find((p) => gradesForSite(grades, p.url).length >= 2) ?? projects[0];
  return [
    { label: "Grade a site", done: grades.length > 0, href: "/grade", action: "Grade a site" },
    {
      label: "Save it as a project",
      done: projects.length > 0,
      href: grades[0] ? `/projects?url=${encodeURIComponent(grades[0].entry_url)}` : "/projects",
      action: "Save a project",
    },
    {
      label: "Re-grade after you fix it",
      done: projects.some((p) => gradesForSite(grades, p.url).length >= 2),
      href: regradeProject ? regradePath(regradeProject.url) : "/grade",
      action: "Re-grade the site",
    },
  ];
}
