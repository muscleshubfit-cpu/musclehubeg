import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lang = request.nextUrl.searchParams.get("lang") || "en";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let title = "MuscleHub — Coach Ahmed Zake";
  let description = "AI-powered fitness & nutrition coaching platform";
  let image = "https://musclehubeg.vercel.app/logo.png";

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&language=eq.${lang}&is_published=eq.true&select=title,meta_title,meta_description,excerpt,featured_image&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const post = data?.[0];
        if (post) {
          title = post.meta_title || post.title || title;
          description = post.meta_description || post.excerpt || description;
          image = post.featured_image || image;
        }
      }
    } catch {}
  }

  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}${lang === "ar" ? "/ar/blog" : "/blog"}/${slug}`;
  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="utf-8"/><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${articleUrl}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="MuscleHub"/>
<meta property="og:locale" content="${lang === "ar" ? "ar_EG" : "en_US"}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${image}"/>
<meta http-equiv="refresh" content="0;url=${articleUrl}"/>
<link rel="canonical" href="${articleUrl}"/>
</head><body><p>Redirecting...</p></body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
