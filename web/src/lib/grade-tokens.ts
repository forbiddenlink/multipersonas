export const GRADE_TOKEN_STORAGE_KEY = "pa.gradeTokens.v1";
export const MAX_GRADE_TOKENS = 20;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseGradeTokens(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const token = item.trim().toLowerCase();
    if (!UUID_RE.test(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= MAX_GRADE_TOKENS) break;
  }
  return tokens;
}

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseGradeTokens(JSON.parse(localStorage.getItem(GRADE_TOKEN_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function writeStore(tokens: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GRADE_TOKEN_STORAGE_KEY, JSON.stringify(tokens.slice(0, MAX_GRADE_TOKENS)));
  } catch {
    // Private mode / quota — remembering grades is best-effort.
  }
}

export function rememberGradeToken(token: string): void {
  const [parsed] = parseGradeTokens([token]);
  if (!parsed) return;
  writeStore([parsed, ...readStore().filter((existing) => existing !== parsed)]);
}

export function readRememberedGradeTokens(): string[] {
  return readStore();
}

export function clearRememberedGradeTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GRADE_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}
