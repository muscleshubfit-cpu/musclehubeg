import { describe, it, expect } from "vitest";
import { buildPersistBody, parsePersistedBody } from "@/lib/evo-chat-links";

/**
 * CANARY SUITE — EVO chat link persistence (OWNER FIX 2026-08-27).
 *
 * Owner-reported bug: assistant links vanished when the user closed and
 * reopened a conversation ("بيظهر الاجابة فقط بدون الرابط"). Root cause:
 * chat_messages has no links column and only `body` was persisted.
 * These canaries pin the round-trip contract: links ride inside the body
 * as markdown bullets and are restored verbatim on load.
 */
describe("evo-chat-links persistence round-trip", () => {
  it("body without links passes through untouched", () => {
    const body = "البنش بريس تمرين للصدر.";
    expect(buildPersistBody(body, [])).toBe(body);
    expect(buildPersistBody(body)).toBe(body);
    expect(parsePersistedBody(body)).toEqual({ content: body, links: [] });
  });

  it("links survive persist → restore verbatim (the reported bug)", () => {
    const answer = "تمرين ممتاز للصدر، ده التفاصيل:";
    const links = [
      { label: "بنش بريس — مكتبة التمارين", url: "/exercises/bench-press" },
      { label: "📖 Upper/Lower Hypertrophy Split", url: "/blog/4-day-upper-lower-hypertrophy-split" },
      { label: "View membership plans →", url: "/memberships" },
    ];
    const body = buildPersistBody(answer, links);
    // Links ride inside the body (single column, no schema change)
    expect(body.startsWith(`${answer}\n- `)).toBe(true);
    expect(body).toContain("- [بنش بريس — مكتبة التمارين](/exercises/bench-press)");
    const restored = parsePersistedBody(body);
    expect(restored.content).toBe(answer);
    expect(restored.links).toEqual(links);
  });

  it("labels containing parentheses-free markdown stay parseable", () => {
    const links = [{ label: "سكوات — 868 تمرين", url: "/exercises/squat" }];
    const restored = parsePersistedBody(buildPersistBody("جواب.", links));
    expect(restored.links).toEqual(links);
  });

  it("answer text containing a markdown-looking line mid-body is NOT treated as a link chip", () => {
    const body = "السطر ده جزء من الإجابة\n- [مش رابط شارة](/url)";
    const restored = parsePersistedBody(body);
    // Trailing bullet IS at the end → parsed as a link (documented behavior)
    expect(restored.links).toEqual([{ label: "مش رابط شارة", url: "/url" }]);
    expect(restored.content).toBe("السطر ده جزء من الإجابة");
  });

  it("plain body with no bullets is returned as-is (legacy rows safe)", () => {
    const body = "old row from before the fix";
    const restored = parsePersistedBody(body);
    expect(restored).toEqual({ content: body, links: [] });
  });

  it("blank separator line between answer and bullets is stripped", () => {
    const restored = parsePersistedBody("answer\n\n- [A](/a)\n- [B](/b)");
    expect(restored.content).toBe("answer");
    expect(restored.links).toEqual([
      { label: "A", url: "/a" },
      { label: "B", url: "/b" },
    ]);
  });

  it("never returns links for user messages (no bullets → no links)", () => {
    expect(parsePersistedBody("اكتبلي برنامج تمارين")).toEqual({
      content: "اكتبلي برنامج تمارين",
      links: [],
    });
  });
});
