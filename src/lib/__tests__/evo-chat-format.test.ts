import { describe, it, expect } from "vitest";
import {
  sanitizeLatexToPlain,
  stripMarkdownSyntax,
} from "@/lib/evo-chat-format";

/**
 * OWNER INCIDENT CANARIES (2026-08-27 screenshot):
 * EVO answered a general math question with raw TeX that reached the user
 * verbatim because the chat renders plain text only. These tests replay
 * the EXACT production patterns and must never regress.
 */
describe("sanitizeLatexToPlain — owner screenshot canaries", () => {
  it("replays the sphere-volume line exactly as it appeared in production", () => {
    const raw = "- إذا كان الكائن ثلاثي الأبعاد: V = \\frac{4}{3}\\pi\\ r^{3}.";
    const out = sanitizeLatexToPlain(raw);
    expect(out).not.toContain("\\frac");
    expect(out).not.toContain("\\pi");
    expect(out).not.toContain("^{");
    expect(out).toContain("(4/3)π");
    expect(out).toContain("r³");
  });

  it("replays the cylinder line (V = \\pi r^{2}h)", () => {
    const out = sanitizeLatexToPlain("V = \\pi r^{2}h");
    expect(out).toBe("V = π r²h");
  });

  it("replays the circumference line (2\\pi r)", () => {
    const out = sanitizeLatexToPlain("C = 2\\pi r");
    expect(out).toBe("C = 2π r");
  });

  it("replays scientific notation 2.2×10^{10} كجم", () => {
    const out = sanitizeLatexToPlain("2.2×10^{10} كجم");
    expect(out).toBe("2.2×10¹⁰ كجم");
  });

  it("converts \\frac{a}{b} to (a/b)", () => {
    expect(sanitizeLatexToPlain("\\frac{4}{3}")).toBe("(4/3)");
  });

  it("converts \\sqrt{x} to √(x)", () => {
    expect(sanitizeLatexToPlain("\\sqrt{144}")).toBe("√(144)");
  });

  it("maps common symbol macros", () => {
    expect(sanitizeLatexToPlain("3 \\times 4 \\pm 1")).toBe("3 × 4 ± 1");
    expect(sanitizeLatexToPlain("x \\geq 5")).toBe("x ≥ 5");
  });

  it("handles caret superscripts without braces", () => {
    expect(sanitizeLatexToPlain("r^3")).toBe("r³");
  });

  it("converts brace subscripts", () => {
    expect(sanitizeLatexToPlain("H_{2}O")).toBe("H₂O");
  });

  it("strips leftover math delimiters", () => {
    expect(sanitizeLatexToPlain("\\(x\\) and \\[y\\]")).toBe("x and y");
  });

  it("leaves plain Arabic text untouched", () => {
    const plain = "حجم القمر يساوي نصف حجم الكرة الأرضية تقريبًا.";
    expect(sanitizeLatexToPlain(plain)).toBe(plain);
  });
});

describe("stripMarkdownSyntax — chat renders plain text only", () => {
  it("removes bold markers but keeps inner text", () => {
    expect(stripMarkdownSyntax("**مهم جدًا**")).toBe("مهم جدًا");
  });

  it("removes heading hashes at line starts", () => {
    expect(stripMarkdownSyntax("## نصائح التمرين\nاكتب هنا")).toBe(
      "نصائح التمرين\nاكتب هنا",
    );
  });

  it("keeps [label](url) links intact for MessageText", () => {
    const raw = "شوف [مكتبة التمارين](/exercises) للمزيد";
    expect(stripMarkdownSyntax(raw)).toBe(raw);
  });

  it("keeps bullet lists intact", () => {
    const raw = "- تمرين الصدر\n- تمرين الظهر";
    expect(stripMarkdownSyntax(raw)).toBe(raw);
  });

  it("removes horizontal rules", () => {
    const out = stripMarkdownSyntax("فوق\n---\nتحت");
    expect(out).toBe("فوق\nتحت");
  });
});
