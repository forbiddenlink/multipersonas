import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { JourneyClipProps } from "./schema";
import { COLORS, FONT_MONO, FONT_SERIF, FONT_SANS, frustrationColor, severity } from "./theme";

/**
 * A ~6s forensic-terminal replay clip: the persona's frames cross-fading, its inner
 * monologue captioned, the axe evidence surfacing at the state it was found, and a
 * frustration ribbon rising to the outcome. Slack-able. Every share is an ad.
 *
 * Honesty wall preserved even in motion: reasoning is narration, the ribbon is inferred,
 * and only axe findings get a severity glyph.
 */
export const JourneyClip: React.FC<JourneyClipProps> = ({ url, personaName, goalCompleted, steps }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const outroFrames = 36; // ~1.2s summary card at the end
  const bodyFrames = Math.max(durationInFrames - outroFrames, 1);
  const perStep = bodyFrames / Math.max(steps.length, 1);
  const idx = Math.min(Math.floor(frame / perStep), steps.length - 1);
  const step = steps[idx] ?? steps[steps.length - 1];
  const localFrame = frame - idx * perStep;
  const fade = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const inOutro = frame >= bodyFrames;

  const band = frustrationColor(step?.frustration ?? 0);

  if (inOutro) {
    const oF = frame - bodyFrames;
    const rise = interpolate(oF, [0, 12], [0, 1], { extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONT_SANS, justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: rise, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 26, color: goalCompleted ? COLORS.primary : "#e5484d", letterSpacing: 1 }}>
            {goalCompleted ? "GOAL REACHED" : "BLOCKED"}
          </div>
          <div style={{ marginTop: 18, fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.fg, maxWidth: width * 0.7 }}>
            {goalCompleted
              ? `${personaName} completed the task.`
              : `${personaName} could not complete the task.`}
          </div>
          <div style={{ marginTop: 28, fontFamily: FONT_MONO, fontSize: 20, color: COLORS.muted }}>
            person<span style={{ color: COLORS.primary }}>audit</span>
            <span style={{ color: COLORS.primary }}>▮</span>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONT_SANS }}>
      {/* Top chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 28px", fontFamily: FONT_MONO, fontSize: 20, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ color: COLORS.primary }}>›</span>
        <span style={{ color: COLORS.fg }}>{personaName}</span>
        <span style={{ marginLeft: "auto", maxWidth: width * 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
      </div>

      {/* Frame */}
      <div style={{ position: "relative", flex: 1, backgroundColor: "#0f0c09", overflow: "hidden" }}>
        {step?.screenshot ? (
          <Img
            src={step.screenshot}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: fade }}
          />
        ) : (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, color: COLORS.muted }}>
            no frame
          </AbsoluteFill>
        )}

        {/* Caption overlay */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "28px 32px", background: "linear-gradient(to top, rgba(15,12,9,0.94) 40%, rgba(15,12,9,0))" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, textTransform: "uppercase", letterSpacing: 1, color: COLORS.muted, opacity: fade }}>
            {step?.action}
          </div>
          {step?.reasoning ? (
            <div style={{ marginTop: 10, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 30, lineHeight: 1.35, color: COLORS.fg, opacity: fade, maxWidth: width * 0.8 }}>
              &ldquo;{step.reasoning}&rdquo;
            </div>
          ) : null}
          {step?.findings?.length ? (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, opacity: fade }}>
              {step.findings.slice(0, 2).map((f, i) => {
                const s = severity(f.severity);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${s.color}`, borderRadius: 4, padding: "4px 10px", fontFamily: FONT_MONO, fontSize: 16, color: s.color }}>
                    <span>{s.glyph}</span>
                    <span style={{ color: COLORS.fg }}>{f.title}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Frustration ribbon */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 28px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", gap: 3, flex: 1, height: 26 }}>
          {steps.map((s, i) => {
            const c = frustrationColor(s.frustration).color;
            const active = i === idx;
            return (
              <div key={i} style={{ position: "relative", flex: 1, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden", outline: active ? `2px solid ${COLORS.primary}` : "none" }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.max(s.frustration, 6)}%`, backgroundColor: c }} />
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: band.color, minWidth: 150, textAlign: "right" }}>
          {step?.frustration ?? 0} {band.label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
