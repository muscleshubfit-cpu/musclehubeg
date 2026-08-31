/**
 * COACH CERTIFICATES (0049) canaries — src/lib/coach-landing-server.ts →
 * parseCertificates().
 *
 * Owner request (2026-08-31): optional certificates section on the public
 * coach page. The jsonb column arrives UNTRUSTED from the DB — the parser
 * is the public page's only defense: malformed rows must be dropped, the
 * array capped, and an empty/missing array must keep the section hidden.
 */
import { describe, it, expect } from "vitest";
import { parseCertificates } from "@/lib/coach-landing-server";

const BUCKET_PATH = "/storage/v1/object/public/coach-public/uid-1/cert-1.jpg";

describe("parseCertificates (0049)", () => {
  it("returns [] for non-array input (missing column / bad jsonb)", () => {
    expect(parseCertificates(undefined)).toEqual([]);
    expect(parseCertificates(null)).toEqual([]);
    expect(parseCertificates({ url: BUCKET_PATH })).toEqual([]);
    expect(parseCertificates("not-an-array")).toEqual([]);
  });

  it("keeps valid rows: url required, title trimmed to 120 chars", () => {
    const out = parseCertificates([{ url: BUCKET_PATH, title: "ISSA CPT" }]);
    expect(out).toEqual([{ url: BUCKET_PATH, title: "ISSA CPT" }]);

    const long = "a".repeat(500);
    const capped = parseCertificates([{ url: BUCKET_PATH, title: long }]);
    expect(capped[0].title).toHaveLength(120);
  });

  it("drops rows without a url and keeps the rest", () => {
    const out = parseCertificates([
      { title: "no url here" },
      { url: BUCKET_PATH, title: "NASM" },
      null,
      { url: 42, title: "non-string url" },
    ]);
    expect(out).toEqual([{ url: BUCKET_PATH, title: "NASM" }]);
  });

  it("caps the array at 8 certificates", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      url: `/storage/v1/object/public/coach-public/u/cert-${i}.jpg`,
      title: `cert ${i}`,
    }));
    const out = parseCertificates(many);
    expect(out).toHaveLength(8);
    expect(out[7].title).toBe("cert 7");
  });
});
