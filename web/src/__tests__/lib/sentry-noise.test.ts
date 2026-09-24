import { describe, expect, it } from "vitest";
import { isClientAbortedStream } from "@/lib/sentry-noise";

describe("client-aborted RSC streams are not Sentry issues", () => {
  it("drops Next's exact wording, however it is thrown", () => {
    expect(isClientAbortedStream(new Error("The destination stream closed early."))).toBe(true);
    expect(isClientAbortedStream("The destination stream closed early.")).toBe(true);
    expect(isClientAbortedStream({ message: "The destination stream closed early." })).toBe(true);
    expect(isClientAbortedStream(new Error("  The destination stream closed early.  "))).toBe(true);
  });

  it("keeps every other stream failure reportable", () => {
    expect(isClientAbortedStream(new Error("The destination stream closed early. ECONNRESET"))).toBe(false);
    expect(isClientAbortedStream(new Error("stream closed early"))).toBe(false);
    expect(isClientAbortedStream(new Error("Failed to write to the destination stream"))).toBe(false);
  });

  it("is safe on the shapes an unknown throw actually takes", () => {
    expect(isClientAbortedStream(undefined)).toBe(false);
    expect(isClientAbortedStream(null)).toBe(false);
    expect(isClientAbortedStream(0)).toBe(false);
    expect(isClientAbortedStream({})).toBe(false);
    expect(isClientAbortedStream({ message: 42 })).toBe(false);
  });
});
