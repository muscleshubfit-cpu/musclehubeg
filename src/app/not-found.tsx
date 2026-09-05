import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "404 — Page Not Found | Alkemos",
  alternates: {
    canonical: "",
  },
};

export default async function NotFound() {
  // M39 fix: detect locale from the pathname (set by middleware as x-pathname
  // header, or fallback to checking the URL). Arabic routes start with /ar/.
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || headerList.get("x-invoke-path") || "";
  const isAr = pathname.startsWith("/ar");

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
            __html: `body{color:#000;background:#fff;margin:0}.next-error-h1{border-inline-end:1px solid rgba(0,0,0,.3);padding-inline-end:23px;margin-inline-end:20px}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-inline-end:1px solid rgba(255,255,255,.3)}}`,
          }}
        />
        <h1
          className="next-error-h1"
          style={{
            display: "inline-block",
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
            {isAr ? "هذه الصفحة غير موجودة." : "This page could not be found."}
          </h2>
          <p style={{ marginTop: "16px" }}>
            <Link
              href={isAr ? "/ar" : "/"}
              style={{
                color: "#0071e3",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              {isAr ? "العودة للرئيسية ←" : "Go back home →"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
