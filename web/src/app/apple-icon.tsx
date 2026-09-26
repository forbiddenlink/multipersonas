import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Evidence-dossier mark: redline checked box on manila, literal hex for Satori.
const DESK = "#f8f4eb";
const REDLINE = "#b71a18";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: DESK,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 20 20" fill="none">
          <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke={REDLINE} strokeWidth="1.6" />
          <path d="M5.5 10.5l3 3 6-7" stroke={REDLINE} strokeWidth="2" strokeLinecap="square" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
