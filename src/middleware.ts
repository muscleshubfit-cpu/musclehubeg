import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase session middleware.
 *
 * CRITICAL for OAuth: @supabase/ssr's browser client stores the PKCE code
 * verifier in localStorage by default. But the /auth/callback route handler
 * runs on the server, which can't read localStorage. The fix is to use
 * @supabase/ssr's createServerClient in middleware — it syncs the auth
 * session (and PKCE verifier) to cookies, so both client and server share
 * the same storage.
 *
 * Without this middleware, Google OAuth fails with:
 * "PKCE code verifier not found in storage. This can happen if the auth
 * flow was initiated in a different browser or device, or if the storage
 * was cleared."
 *
 * This middleware also refreshes expired sessions on every request.
 */
export async function middleware(request: NextRequest) {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

 // If Supabase isn't configured, skip middleware (demo mode).
 if (!supabaseUrl || !supabaseAnonKey) {
 return NextResponse.next();
 }

 let response = NextResponse.next({
 request: {
 headers: request.headers,
 },
 });

 const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
 cookies: {
 getAll() {
 return request.cookies.getAll();
 },
 setAll(cookiesToSet) {
 cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
 response = NextResponse.next({
 request: {
 headers: request.headers,
 },
 });
 cookiesToSet.forEach(({ name, value, options }) =>
 response.cookies.set(name, value, options),
 );
 },
 },
 });

 // Refresh the session (this also sets the cookies via setAll above).
 // IMPORTANT: do not run any code between createServerClient and
 // supabase.auth.getUser — the session refresh depends on this ordering.
 await supabase.auth.getUser();

 return response;
}

export const config = {
 matcher: [
 // Run on all routes except static assets and Next internals.
 "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|js|css)$).*)",
 ],
};

/**
 * Blog article OG tag injection.
 * 
 * For /blog/[slug] and /ar/blog/[slug] URLs, fetch the article from Supabase
 * and inject OG meta tags directly into the <head> of the HTML response.
 * This ensures Facebook, LinkedIn, X, and WhatsApp can read the tags.
 */
async function injectBlogOGTags(request: NextRequest, response: NextResponse) {
  const path = request.nextUrl.pathname;
  
  // Only process blog article pages
  const enMatch = path.match(/^\/blog\/([^\/]+)$/);
  const arMatch = path.match(/^\/ar\/blog\/([^\/]+)$/);
  const match = enMatch || arMatch;
  if (!match) return response;

  const slug = match[1];
  const lang = arMatch ? "ar" : "en";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return response;

  try {
    // Fetch the article
    const res = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&language=eq.${lang}&is_published=eq.true&select=title,meta_title,meta_description,excerpt,featured_image,cover_alt&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (!res.ok) return response;
    const data = await res.json();
    const post = data?.[0];
    if (!post) return response;

    const baseUrl = "https://musclehubeg.vercel.app";
    const articleUrl = `${baseUrl}${lang === "ar" ? "/ar/blog" : "/blog"}/${slug}`;
    const title = post.meta_title || post.title;
    const description = post.meta_description || post.excerpt || "";
    const image = post.featured_image || `${baseUrl}/logo.png`;

    // Build OG meta tags
    const ogTags = [
      `<meta property="og:type" content="article"/>`,
      `<meta property="og:url" content="${articleUrl}"/>`,
      `<meta property="og:title" content="${(title || "").replace(/"/g, '&quot;')}"/>`,
      `<meta property="og:description" content="${(description || "").replace(/"/g, '&quot;')}"/>`,
      `<meta property="og:image" content="${image}"/>`,
      `<meta property="og:image:width" content="1200"/>`,
      `<meta property="og:image:height" content="630"/>`,
      `<meta property="og:site_name" content="MuscleHub"/>`,
      `<meta property="og:locale" content="${lang === "ar" ? "ar_EG" : "en_US"}"/>`,
      `<meta name="twitter:card" content="summary_large_image"/>`,
      `<meta name="twitter:title" content="${(title || "").replace(/"/g, '&quot;')}"/>`,
      `<meta name="twitter:description" content="${(description || "").replace(/"/g, '&quot;')}"/>`,
      `<meta name="twitter:image" content="${image}"/>`,
    ].join("\n    ");

    // Inject into the HTML response
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = await response.text();
      // Insert OG tags right before </head>
      if (html.includes("</head>")) {
        html = html.replace("</head>", `    ${ogTags}\n</head>`);
      } else {
        // If no </head>, add after the first <head>
        html = html.replace(/<head>/, `<head>\n    ${ogTags}`);
      }
      return new NextResponse(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch (e) {
    console.error("[middleware] OG tag injection failed:", e);
  }

  return response;
}
