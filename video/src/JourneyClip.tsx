import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { JourneyClipProps } from "./schema";
import { COLORS, FONT_MONO, FONT_SERIF, FONT_SANS, frustrationColor, severity } from "./theme";

/**
 * A ~6s forensic evidence replay clip: the persona's frames cross-fading, its inner
 * monologue captioned on a dossier paper sheet, the axe evidence surfacing at the state
 * it was found, and a frustration ribbon rising to the outcome. Slack-ready evidence.
 *
 * Honesty wall preserved in motion: reasoning is labeled AI opinion, the ribbon is inferred
 * frustration, and only deterministic axe findings get a severity glyph.
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
        <div
          style={{
            opacity: rise,
            textAlign: "center",
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            padding: "48px 56px",
            borderRadius: 4,
            boxShadow: `0 18px 40px -24px ${COLORS.shadow}`,
            maxWidth: width * 0.8,
          }}
        >
          <div
            style={{
              display: "inline-block",
              border: `2px solid ${goalCompleted ? COLORS.primary : COLORS.redline}`,
              padding: "6px 18px",
              fontFamily: FONT_MONO,
              fontSize: 20,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: goalCompleted ? COLORS.primary : COLORS.redline,
              transform: "rotate(-1.2deg)",
            }}
          >
            {goalCompleted ? "✓ GOAL REACHED" : "■ BLOCKED AT CHECKOUT"}
          </div>
          <div style={{ marginTop: 24, fontFamily: FONT_SERIF, fontSize: 32, lineHeight: 1.25, color: COLORS.fg }}>
            {goalCompleted
              ? `${personaName} completed the task.`
              : `${personaName} could not complete the task.`}
          </div>
          <div style={{ marginTop: 12, fontFamily: FONT_MONO, fontSize: 15, color: COLORS.muted }}>
            Target: {url}
          </div>
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${COLORS.border}`, fontFamily: FONT_MONO, fontSize: 16, color: COLORS.muted }}>
            person<span style={{ color: COLORS.primary, fontWeight: 700 }}>audit</span> · evidence dossier
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONT_SANS }}>
      {/* Top dossier chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 28px",
          backgroundColor: COLORS.panel,
          fontFamily: FONT_MONO,
          fontSize: 16,
          color: COLORS.muted,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ color: COLORS.primary, fontWeight: 700 }}>PA-REPLAY</span>
        <span>·</span>
        <span style={{ color: COLORS.fg }}>{personaName}</span>
        <span style={{ marginLeft: "auto", maxWidth: width * 0.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {url}
        </span>
      </div>

      {/* Frame viewport */}
      <div style={{ position: "relative", flex: 1, backgroundColor: "#ede9e0", overflow: "hidden" }}>
        {step?.screenshot ? (
          <Img
            src={step.screenshot}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              opacity: fade,
            }}
          />
        ) : (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, color: COLORS.muted }}>
            no frame captured
          </AbsoluteFill>
        )}

        {/* Paper caption overlay */}
        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 28,
            padding: "20px 24px",
            backgroundColor: "rgba(254, 253, 251, 0.96)",
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            boxShadow: `0 12px 28px -12px ${COLORS.shadow}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.muted }}>
              {step?.action}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.redline, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Opinion · AI
            </div>
          </div>
          {step?.reasoning ? (
            <div
              style={{
                marginTop: 8,
                fontFamily: FONT_SERIF,
                fontStyle: "italic",
                fontSize: 24,
                lineHeight: 1.35,
                color: COLORS.fg,
                opacity: fade,
                maxWidth: width * 0.82,
              }}
            >
              &ldquo;{step.reasoning}&rdquo;
            </div>
          ) : null}
          {step?.findings?.length ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, opacity: fade }}>
              {step.findings.slice(0, 2).map((f, i) => {
                const s = severity(f.severity);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: `1px solid ${s.color}`,
                      borderRadius: 2,
                      padding: "3px 8px",
                      fontFamily: FONT_MONO,
                      fontSize: 13,
                      color: s.color,
                      backgroundColor: COLORS.panel,
                    }}
                  >
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 28px",
          backgroundColor: COLORS.panel,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 4, flex: 1, height: 22 }}>
          {steps.map((s, i) => {
            const c = frustrationColor(s.frustration).color;
            const active = i === idx;
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: COLORS.border,
                  overflow: "hidden",
                  outline: active ? `2px solid ${COLORS.primary}` : "none",
                }}
              >
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.max(s.frustration, 8)}%`, backgroundColor: c }} />
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: band.color, minWidth: 140, textAlign: "right" }}>
          {step?.frustration ?? 0} {band.label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
