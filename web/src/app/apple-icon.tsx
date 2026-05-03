import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          backgroundColor: "#3bb8a8",
          borderRadius: "40px",
          fontSize: "100px",
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          color: "#1a1a2e",
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}
