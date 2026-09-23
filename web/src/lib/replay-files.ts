import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

const PAGE_END_OFFSET = 999;
const ID_CHUNK = 100;
const STORAGE_BATCH = 100;

/** Stable message for callers. Provider text can contain stored paths. */
export const REPLAY_DELETE_FAILED = "Could not delete stored replay screenshots.";

interface Counted<T> {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
}

/**
 * Read every matching row in stable id order. A failed, truncated, or shifting
 * read aborts so deletion cannot proceed on a partial file list.
 */
async function loadComplete<T>(
  fetchPage: (from: number, to: number) => PromiseLike<Counted<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let expectedCount: number | undefined;
  do {
    const { data, error, count } = await fetchPage(rows.length, rows.length + PAGE_END_OFFSET);
    if (
      error ||
      !data ||
      count === null ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      (expectedCount !== undefined && count !== expectedCount) ||
      rows.length + data.length > count ||
      (data.length === 0 && rows.length < count)
    ) {
      throw new Error(REPLAY_DELETE_FAILED);
    }
    expectedCount = count;
    rows.push(...data);
  } while (rows.length < expectedCount);
  return rows;
}

/** A stored object is deletable only when it sits inside one of this project's runs. */
function ownedReplayPath(path: string, runIds: ReadonlySet<string>): boolean {
  if (path.length === 0 || path.length > 512) return false;
  if (path.includes("\0") || path.includes("\\") || path.includes("..")) return false;
  if (path.startsWith("/") || path.endsWith("/")) return false;
  const parts = path.split("/");
  if (parts.length < 2 || parts.some((part) => part.length === 0)) return false;
  return runIds.has(parts[0] ?? "");
}

function confirmedMissing(item: { signedUrl?: string | null; error?: string | null }): boolean {
  if (item.signedUrl) return false;
  // Storage reports a missing object as "Object not found", "The resource was not found",
  // or the not_found code. A signed URL with no error means the file is still readable.
  return typeof item.error === "string" && /not[_\s-]?found/i.test(item.error);
}

/**
 * Remove replay screenshots for a project while its runs still exist.
 * Storage policies allow the owner to delete only objects whose first folder
 * matches one of their test runs, so this must run before the project cascade.
 * A file uploaded after this read can remain; the project is kept when removal
 * or the follow-up existence check fails.
 */
export async function removeProjectReplayFiles(supabase: SB, projectId: string): Promise<void> {
  const runs = await loadComplete<{ id: string }>((from, to) =>
    supabase
      .from("test_runs")
      .select("id", { count: "exact" })
      .eq("project_id", projectId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  const runIds = runs.map((run) => run.id);
  const owned = new Set(runIds);
  const paths: string[] = [];

  for (let index = 0; index < runIds.length; index += ID_CHUNK) {
    const chunk = runIds.slice(index, index + ID_CHUNK);
    const steps = await loadComplete<{ id: string; screenshot_path: string | null }>((from, to) =>
      supabase
        .from("journey_steps")
        .select("id,screenshot_path", { count: "exact" })
        .in("test_run_id", chunk)
        .not("screenshot_path", "is", null)
        .order("id", { ascending: true })
        .range(from, to),
    );
    for (const step of steps) {
      if (!step.screenshot_path || !ownedReplayPath(step.screenshot_path, owned)) {
        throw new Error(REPLAY_DELETE_FAILED);
      }
      paths.push(step.screenshot_path);
    }
  }

  const uniquePaths = [...new Set(paths)];
  const bucket = supabase.storage.from("journeys");
  for (let index = 0; index < uniquePaths.length; index += STORAGE_BATCH) {
    const batch = uniquePaths.slice(index, index + STORAGE_BATCH);
    const removed = await bucket.remove(batch);
    if (removed.error) throw new Error(REPLAY_DELETE_FAILED);
    const signed = await bucket.createSignedUrls(batch, 60);
    if (signed.error || !signed.data || signed.data.length !== batch.length) {
      throw new Error(REPLAY_DELETE_FAILED);
    }
    if (signed.data.some((item) => !confirmedMissing(item))) {
      throw new Error(REPLAY_DELETE_FAILED);
    }
  }
}
