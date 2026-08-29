import { NextRequest } from "next/server";
import { ImageResponse } from "@vercel/og";
import { fetchBlogForOG } from "@/lib/blog-server";

/**
 * Dynamic OG image generator.
 *
 * GET /api/og-image/[slug]?lang=en|ar
 *
 * Returns a 1200×630 PNG image optimized for social sharing (Twitter,
 * Facebook, LinkedIn, WhatsApp, Telegram). Generated on-the-fly using
 * @vercel/og (Satori under the hood) — no static image generation
 * needed.
 *
 * Design:
 *   - Dark gradient background (#1d1d1f → #0071e3)
 *   - Musclehubeg logo + brand mark top-left
 *   - Article title centered (auto-fit font size based on length)
 *   - Article description (truncated to 120 chars)
 *   - Site URL "musclehubeg.vercel.app" footer
 */

export const runtime = "edge";
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const lang = (request.nextUrl.searchParams.get("lang") as "en" | "ar") || "en";

  // Defaults if post not found
  let title = "Musclehubeg — Fitness & Nutrition Platform";
  let description = "AI-powered fitness & nutrition coaching platform";

  try {
    const og = await fetchBlogForOG(slug, lang);
    if (og) {
      title = og.title;
      description = og.description;
    }
  } catch {
    // keep defaults
  }

  // Truncate description to fit
  const descTruncated =
    description.length > 120
      ? description.slice(0, 117) + "…"
      : description;

  // Auto-fit font size based on title length
  const titleLength = title.length;
  const titleFontSize = titleLength > 80 ? 36 : titleLength > 50 ? 48 : titleLength > 30 ? 60 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1d1d1f 0%, #0071e3 100%)",
          padding: 60,
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        {/* Header: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "white",
              color: "#0071e3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            Musclehubeg
          </div>
        </div>

        {/* Title + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              opacity: 0.85,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {descTruncated}
          </div>
        </div>

        {/* Footer: URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.7,
          }}
        >
          <div>musclehubeg.vercel.app</div>
          <div>{lang === "ar" ? "مدونة Musclehubeg" : "Musclehubeg Blog"}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
