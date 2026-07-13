import { ImageResponse } from "next/og";
import de from "@/messages/de.json";

export const runtime = "edge";

export const alt = de.meta.ogTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Placeholder OG image, rendered on the fly — replace with a real
 * photo asset (public/og.png + metadata) once brand visuals exist.
 */
export default function OpengraphImage() {
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
          background: "linear-gradient(156deg, #2A2C31 28%, #16171A 100%)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "#E63A41",
          }}
        >
          {de.comingSoon.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {de.comingSoon.h1}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {de.meta.ogDescription}
        </div>
        <div
          style={{
            position: "absolute",
            right: 64,
            top: 56,
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "rgba(212,32,40,0.35)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -60,
            bottom: -80,
            width: 260,
            height: 260,
            borderRadius: 9999,
            background: "rgba(119,1,16,0.55)",
            filter: "blur(70px)",
          }}
        />
      </div>
    ),
    size,
  );
}
