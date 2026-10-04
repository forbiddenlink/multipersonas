import { ruleFix } from "@/components/dossier/grade-remediation";

/**
 * Display text for a stored axe finding. Rules in the remediation table (the same one the
 * free grade page uses) get a plain title, why and fix. Unknown rules keep axe's own help
 * and description text, so nothing is invented. The raw "See <url> for remediation
 * guidance." sentence the scanner stores is turned into a short "Learn more" link.
 */
export interface FindingDisplayInput {
  ruleId: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
}

export interface FindingDisplay {
  title: string;
  /** What breaks for a real user: plain text for known rules, axe's description otherwise. */
  why: string | null;
  /** Concrete fix; null when only the url sentence was stored and the rule is unknown. */
  fix: string | null;
  /** Deque rule page without tracking query, or null. */
  learnMore: string | null;
  ruleId: string | null;
}

const URL_SENTENCE = /^See (\S+) for remediation guidance\.?$/;

/** Deque help url without its query string (application=playwright and the like). */
export function learnMoreUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function displayFinding(f: FindingDisplayInput): FindingDisplay {
  const known = f.ruleId ? ruleFix(f.ruleId) : undefined;
  const rec = f.recommendation?.trim() ?? "";
  const sentence = URL_SENTENCE.exec(rec);
  const learnMore = sentence ? learnMoreUrl(sentence[1]!) : null;
  const storedFix = sentence ? null : rec || null;
  return {
    title: known?.title ?? f.title,
    why: known?.why ?? f.description ?? null,
    fix: known?.fix ?? storedFix,
    learnMore,
    ruleId: f.ruleId,
  };
}
