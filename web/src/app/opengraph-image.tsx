import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Personaudit — accessibility scanning for the pages behind your login";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a2e",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#3bb8a8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              color: "#1a1a2e",
            }}
          >
            M
          </div>
          <span style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Personaudit
          </span>
        </div>
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
          }}
        >
          Scan the pages a crawler can&apos;t reach
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#9ca3af",
            marginTop: "24px",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          Crawls behind your login and runs axe-core at every state a page-level scan never sees
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
          }}
        >
          {["Behind login", "axe-core verdicts", "CI-gated"].map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(59, 184, 168, 0.3)",
                backgroundColor: "rgba(59, 184, 168, 0.1)",
                fontSize: "14px",
                color: "#3bb8a8",
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
