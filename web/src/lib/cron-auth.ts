import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Hash both sides so timingSafeEqual gets equal-length buffers and the
// comparison time does not reveal how much of the secret a caller guessed.
export function bearerMatches(authorization: string, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
