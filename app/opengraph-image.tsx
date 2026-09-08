import { ImageResponse } from "next/og";

// Default share image for every route that doesn't define its own —
// static (no request data), so Next statically optimizes it at build time
// instead of regenerating it per share.
export const alt = "DetectiveNights";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#241a10",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "9999px",
            border: "5px solid #d9a441",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#d9a441",
              lineHeight: 1,
              transform: "translateY(-2%)",
            }}
          >
            ?
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{
              fontSize: 88,
              fontStyle: "italic",
              fontWeight: 600,
              color: "#f4ece1",
              lineHeight: 1.05,
            }}
          >
            DetectiveNights
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 34,
              color: "#d9a441",
              letterSpacing: 1,
            }}
          >
            A lateral thinking puzzle game for groups
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
