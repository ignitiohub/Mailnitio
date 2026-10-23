import { ImageResponse } from "next/og";

export const alt = "Mailnitio: Every support email in the right place, in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Open Graph images are rendered outside the CSS token system, so brand values are set inline here.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#F7F8FA",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#3B3FC4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          M
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, color: "#0E1525" }}>Mailnitio</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{ fontSize: 64, fontWeight: 600, color: "#0E1525", letterSpacing: -1.5, lineHeight: 1.1 }}
        >
          Every support email in the right place, in seconds
        </div>
        <div style={{ fontSize: 28, color: "#4A5568" }}>
          AI that reads, routes and tickets your customer emails. In our helpdesk, or straight into your CRM.
        </div>
      </div>
      <div style={{ display: "flex", height: 8, width: 160, background: "#3B3FC4", borderRadius: 4 }} />
    </div>,
    size,
  );
}
