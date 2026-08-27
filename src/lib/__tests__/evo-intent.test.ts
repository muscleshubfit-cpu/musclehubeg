import { describe, it, expect } from "vitest";
import { classifyEvoIntent } from "@/lib/evo-intent";

/**
 * T-AI-DEEP-AUDIT-V2 — intent classification tests.
 * Guards the D4 monthly plan-quota wiring: plan-creation intents must be
 * classified + domain-resolved correctly, swap intents must stay OUT of
 * the monthly quota, and the subscriber-gate coverage (plan|swap) must
 * exactly match the old flat list semantics.
 */
describe("classifyEvoIntent", () => {
  // ── Plan creation: EN ────────────────────────────────────────────────
  it("classifies EN meal-plan requests as nutrition plan creation", () => {
    const i = classifyEvoIntent("Make me a meal plan for 2000 calories");
    expect(i.isPlanCreation).toBe(true);
    expect(i.isSubscriberOnly).toBe(true);
    expect(i.planDomain).toBe("nutrition");
  });

  it("classifies EN workout-plan requests as workout plan creation", () => {
    const i = classifyEvoIntent("Create a workout plan for me");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("workout");
  });

  it("classifies calorie-spec requests as nutrition plan creation", () => {
    const i = classifyEvoIntent("I need a 1800 kcal diet");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("nutrition");
  });

  // ── Plan creation: AR ────────────────────────────────────────────────
  it("classifies AR meal-plan requests as nutrition plan creation", () => {
    const i = classifyEvoIntent("اعمل خطة تغذية");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("nutrition");
  });

  it("classifies AR program requests as workout plan creation (default)", () => {
    const i = classifyEvoIntent("صمم برنامج تمارين");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("workout");
  });

  it("classifies AR جدول without food keywords as workout (default)", () => {
    const i = classifyEvoIntent("اعمل جدول للمبتدئين");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("workout");
  });

  it("classifies AR calorie meal requests as nutrition", () => {
    const i = classifyEvoIntent("عايز وجبة 700 سعرة");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("nutrition");
  });

  // ── Swap requests: gated but NOT monthly-quota'd ─────────────────────
  it("classifies EN swap requests as swap (not plan creation)", () => {
    const i = classifyEvoIntent("Swap this meal with something else");
    expect(i.isPlanCreation).toBe(false);
    expect(i.isSwapRequest).toBe(true);
    expect(i.isSubscriberOnly).toBe(true);
  });

  it("classifies AR swap requests as swap (not plan creation)", () => {
    const i = classifyEvoIntent("بدّل أكلة تانية");
    expect(i.isPlanCreation).toBe(false);
    expect(i.isSwapRequest).toBe(true);
  });

  it("classifies regenerate requests as swap (not plan creation)", () => {
    const i = classifyEvoIntent("regenerate workout please");
    expect(i.isPlanCreation).toBe(false);
    expect(i.isSwapRequest).toBe(true);
  });

  // ── Plain chat: neither gated nor quota'd ────────────────────────────
  it("classifies plain questions as neither plan nor swap", () => {
    const i = classifyEvoIntent("How many calories in chicken breast?");
    expect(i.isPlanCreation).toBe(false);
    expect(i.isSwapRequest).toBe(false);
    expect(i.isSubscriberOnly).toBe(false);
  });

  it("classifies exercise info questions as free-tier friendly", () => {
    const i = classifyEvoIntent("إزاي أعمل بنش بريس صح؟");
    expect(i.isSubscriberOnly).toBe(false);
  });

  // ── Domain keyword precedence ────────────────────────────────────────
  it("food keywords win the domain when both appear", () => {
    const i = classifyEvoIntent("اعمل خطة أكل وتمارين");
    expect(i.isPlanCreation).toBe(true);
    expect(i.planDomain).toBe("nutrition");
  });
});
