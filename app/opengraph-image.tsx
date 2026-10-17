import { ImageResponse } from "next/og";
import de from "@/messages/de.json";

export const runtime = "edge";

export const alt = de.meta.ogTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview in the site's paper/red palette, rendered on the fly. */
export default function OpengraphImage() {
  const h = de.home.hero;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FFFCF8",
          color: "#211D1B",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#D91F2D" }}>
          {h.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1.08,
          }}
        >
          <span>{h.headline[0]}</span>
          <span style={{ color: "#D91F2D" }}>{h.headline[1]}</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 32, color: "#706864" }}>{de.meta.ogDescription}</div>
      </div>
    ),
    size,
  );
}
