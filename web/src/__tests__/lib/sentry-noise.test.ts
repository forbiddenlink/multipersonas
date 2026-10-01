import { describe, expect, it } from "vitest";
import { isClientAbortedStream, isInjectedEvalError } from "@/lib/sentry-noise";

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

describe("injected EvalErrors are not Sentry issues", () => {
  const evalError = (frames: Array<{ filename?: string; abs_path?: string }>, type = "EvalError") => ({
    exception: { values: [{ type, stacktrace: { frames } }] },
  });
  const sdk = {
    filename: "../node_modules/.pnpm/@sentry+browser@10.71.0/node_modules/@sentry/browser/build/npm/esm/prod/helpers.js",
    abs_path: "app:///_next/static/node_modules/.pnpm/@sentry+browser@10.71.0/node_modules/@sentry/browser/build/npm/esm/prod/helpers.js",
  };
  const anon = { filename: "<anonymous>", abs_path: "<anonymous>" };

  it("drops the PERSONAUDIT-WEB-2 shape: SDK wrapper plus only <anonymous> frames", () => {
    expect(isInjectedEvalError(evalError([sdk, anon, anon, anon]))).toBe(true);
  });

  it("keeps an EvalError that has a frame from the app bundle", () => {
    const app = { filename: "app:///_next/static/chunks/app/page.js", abs_path: "app:///_next/static/chunks/app/page.js" };
    expect(isInjectedEvalError(evalError([sdk, app, anon]))).toBe(false);
  });

  it("keeps other error types with the same frames", () => {
    expect(isInjectedEvalError(evalError([sdk, anon], "TypeError"))).toBe(false);
  });

  it("keeps events with no usable stack", () => {
    expect(isInjectedEvalError({})).toBe(false);
    expect(isInjectedEvalError(evalError([]))).toBe(false);
  });
});
