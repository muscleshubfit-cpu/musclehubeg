import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext", () => {
  it("should return '/' for null input", () => {
    expect(safeNext(null)).toBe("/");
  });

  it("should return '/' for undefined input", () => {
    expect(safeNext(undefined)).toBe("/");
  });

  it("should return '/' for empty string", () => {
    expect(safeNext("")).toBe("/");
  });

  it("should return a valid relative path", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
  });

  it("should preserve query params", () => {
    expect(safeNext("/checkout?tier=premium&months=1")).toBe("/checkout?tier=premium&months=1");
  });

  it("should preserve hash", () => {
    expect(safeNext("/blog/my-post#section-1")).toBe("/blog/my-post#section-1");
  });

  // Security: open-redirect prevention
  it("should reject absolute URLs (https://)", () => {
    expect(safeNext("https://evil.com")).toBe("/");
  });

  it("should reject absolute URLs (http://)", () => {
    expect(safeNext("http://evil.com")).toBe("/");
  });

  it("should reject protocol-relative URLs (//)", () => {
    expect(safeNext("//evil.com")).toBe("/");
  });

  it("should reject backslash-based bypass (/\\)", () => {
    expect(safeNext("/\\evil.com")).toBe("/");
  });

  it("should reject javascript: protocol", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("should handle /auth?next=/dashboard correctly", () => {
    // This is a common pattern — the next param itself is a relative path
    expect(safeNext("/dashboard")).toBe("/dashboard");
  });
});
