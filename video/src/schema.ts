// Props the clip is parametrized with. A journey exported from a real audit (see
// web/src/lib/journey-clip-props.ts) drops straight in here as `inputProps`.

export interface ClipFinding {
  severity: string;
  title: string;
}

export interface ClipStep {
  action: string;
  /** The persona's inner monologue for this step. Narration, never a verdict. */
  reasoning: string | null;
  /** A data URI or absolute URL Remotion can load. For PUBLIC scans only (privacy wall). */
  screenshot: string | null;
  /** 0-100 inferred frustration (from web/src/lib/frustration.ts). */
  frustration: number;
  findings: ClipFinding[];
}

export interface JourneyClipProps {
  url: string;
  personaName: string;
  goalCompleted: boolean;
  steps: ClipStep[];
}

export const DEFAULT_PROPS: JourneyClipProps = {
  url: "https://example.com",
  personaName: "Persona",
  goalCompleted: false,
  steps: [
    { action: "navigate", reasoning: "Landing on the page.", screenshot: null, frustration: 5, findings: [] },
  ],
};

// The clip is a fixed ~6s at 30fps. Each step gets an equal slice, with a short crossfade.
export const FPS = 30;
export const TARGET_SECONDS = 6;

export function durationInFrames(steps: number): number {
  // At least the target length; stretch a little for long journeys so captions stay readable.
  return Math.max(TARGET_SECONDS * FPS, Math.min(steps, 12) * 18);
}
