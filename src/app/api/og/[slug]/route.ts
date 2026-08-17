import { NextRequest, NextResponse } from "next/server";
import { fetchBlogForOG } from "@/lib/blog-server";

/**
 * OG meta HTML endpoint — used by crawlers that don't run JS.
 * Returns a minimal HTML page with OG/Twitter meta tags + a redirect to
 * the real article URL.
 *
 * GET /api/og/[slug]?lang=en|ar
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const lang = (request.nextUrl.searchParams.get("lang") as "en" | "ar") || "en";

  // Defaults if Supabase isn't configured or the post isn't found
  const baseUrl = "https://musclehubeg.vercel.app";
  let title = "MuscleHub — Fitness & Nutrition Platform";
  let description = "AI-powered fitness & nutrition coaching platform";
  let image = `${baseUrl}/logo.png`;
  let articleUrl = `${baseUrl}${lang === "ar" ? "/ar/blog" : "/blog"}/${slug}`;
  let locale = lang === "ar" ? "ar_EG" : "en_US";

  const og = await fetchBlogForOG(slug, lang);
  if (og) {
    title = og.title;
    description = og.description;
    image = og.image;
    articleUrl = og.articleUrl;
    locale = og.locale;
  }

  // Escape ALL interpolated values (including image URL — H6 fix) to prevent
  // attribute injection via stored post data.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="utf-8"/><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${esc(articleUrl)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="MuscleHub"/>
<meta property="og:locale" content="${locale}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(articleUrl)}"/>
<link rel="canonical" href="${esc(articleUrl)}"/>
</head><body><p>Redirecting...</p></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
