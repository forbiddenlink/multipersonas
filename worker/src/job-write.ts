/** Persist a queue transition before reporting success or releasing budget. */
export async function writeJobState(write: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await write;
  if (error) throw new Error(`Job persistence failed: ${error.message}`);
}
