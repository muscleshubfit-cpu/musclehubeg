import Link from "next/link";
import type { Metadata } from "next";

/**
 * Custom 404 page.
 *
 * Adds `noindex, nofollow` so Google does not index 404 URLs (which
 * previously inherited the root `index, follow` metadata + canonical
 * pointing to homepage — causing potential duplicate-content issues).
 *
 * Visual style matches Next.js's default 404 (centered numeric "404"
 * with a divider and a short caption) so the UX is unchanged.
 *
 * NO canonical is set — Next.js will not emit a `<link rel="canonical">`
 * when `metadata.robots.index` is false (which is what we want here).
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "404 — Page Not Found | MuscleHubEG",
  // Override the inherited root canonical — a 404 page should NOT have a
  // canonical pointing to homepage (that would make Google think the 404
  // URL is a duplicate of the homepage, which is wrong and harmful for SEO).
  // Setting canonical to an empty string suppresses the <link rel="canonical">
  // tag entirely. Combined with noindex, this tells Google: "do not index
  // this URL, do not treat it as a duplicate of anything else."
  alternates: {
    canonical: "",
  },
};

export default function NotFound() {
  return (
    <div
      style={{
        fontFamily:
          'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
        height: "100vh",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>
        <style
          dangerouslySetInnerHTML={{
            __html: `body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}`,
          }}
        />
        <h1
          className="next-error-h1"
          style={{
            display: "inline-block",
            margin: "0 20px 0 0",
            padding: "0 23px 0 0",
            fontSize: "24px",
            fontWeight: 500,
            verticalAlign: "top",
            lineHeight: "49px",
          }}
        >
          404
        </h1>
        <div style={{ display: "inline-block" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 400, lineHeight: "49px", margin: 0 }}>
            This page could not be found.
          </h2>
          <p style={{ marginTop: "16px" }}>
            <Link
              href="/"
              style={{
                color: "#0071e3",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Go back home →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
