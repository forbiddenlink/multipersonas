/**
 * A scan where every persona run broke before its first step says nothing about the
 * site. Throwing here sends the job down the worker's failure path (status 'failed',
 * Sentry, alert webhook) instead of saving a completed "0/N achieved" run.
 */
export function assertSomePersonaRan(taskSuccess: { errored: number; total: number }): void {
  const { errored, total } = taskSuccess;
  if (total > 0 && errored === total) {
    throw new Error(`Every persona run errored before its first step (${errored}/${total})`);
  }
}
