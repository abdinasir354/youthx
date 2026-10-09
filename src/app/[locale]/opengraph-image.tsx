import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "YouthX Foundation — Empowering Somali Youth. Building a Better Future.";

/** Default social-share image in brand colors (pages and settings can override it with their own image). */
export default async function OpengraphImage() {
  const icon = await readFile(path.join(process.cwd(), "public", "logo-icon-light.png"));
  const src = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1c4b40", padding: 72, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={src} width={118} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
            <span style={{ color: "#b3e717" }}>YouthX</span>
            <span style={{ marginLeft: 12 }}>Foundation</span>
          </div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.08, maxWidth: 1000 }}>Empowering Somali Youth. Building a Better Future.</div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.75)" }}>Education · Skills · Mentorship · Careers · Entrepreneurship · Community</div>
      </div>
    ),
    size,
  );
}
