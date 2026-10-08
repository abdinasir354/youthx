import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Somali YouthUp Foundation";

/** Default social-share image in brand colors (pages without their own cover use this). */
export default async function OpengraphImage() {
  const t = await getTranslations("home");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1c4b40", padding: 72, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#b3e717", display: "flex", alignItems: "center", justifyContent: "center", color: "#1c4b40", fontSize: 44, fontWeight: 800 }}>↑</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Somali YouthUp Foundation</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{t("heroTitle")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#b3e717", color: "#1c4b40", borderRadius: 999, padding: "10px 24px", fontSize: 28, fontWeight: 700 }}>{t("heroBadge")}</div>
        </div>
      </div>
    ),
    size,
  );
}
