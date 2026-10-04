/**
 * Copy for the /projects page. Free projects hold free grades; audits, re-runs and scan
 * history belong to the paid plans, so the wording follows `planAllowsPersonas`.
 */
export function projectsIntro(canRunPersonas: boolean): string {
  return canRunPersonas
    ? "Group your saved audits by site so a scan history and re-runs stay together."
    : "Group your free grades by site so they stay together and you can re-grade after a fix.";
}

export function projectsEmptyHint(canRunPersonas: boolean): string {
  return canRunPersonas
    ? "Create one above to group saved audits by client site, so history and re-runs stay together."
    : "Create one above to group your free grades by site, so they stay together and you can re-grade after a fix.";
}
