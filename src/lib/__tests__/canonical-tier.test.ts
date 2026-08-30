import { describe, it, expect } from "vitest";
import { canonicalModelTier, getTier, priceFor, type TierId } from "@/lib/plans";

/**
 * 0046 — OWNER DECREE (price revert): the /coaching page keeps selling
 * the ORIGINAL Starter ($20) / Elite ($40) products (the PayPal-tied
 * prices). Clients pay the storefront price; subscription rows are
 * written under the canonical model tiers. These tests lock the two
 * invariants that make that safe:
 *   1. canonicalModelTier maps starter → premium, elite → pro and
 *      passes model tiers through untouched.
 *   2. The PayPal-tied prices are UNCHANGED: Starter $20/$200,
 *      Elite $40/$400 — the owner's exact numbers.
 */
describe("canonicalModelTier (0046 legacy product canonicalization)", () => {
  it("maps starter → premium (0045 successor tier)", () => {
    expect(canonicalModelTier("starter")).toBe("premium");
  });

  it("maps elite → pro (0045 successor tier)", () => {
    expect(canonicalModelTier("elite")).toBe("pro");
  });

  it("passes model tiers through untouched", () => {
    expect(canonicalModelTier("premium")).toBe("premium");
    expect(canonicalModelTier("pro")).toBe("pro");
    expect(canonicalModelTier("coaching")).toBe("coaching");
  });

  it("never emits a tier outside the canonical model", () => {
    for (const product of ["starter", "elite", "premium", "pro", "coaching"]) {
      expect(["premium", "pro", "coaching"]).toContain(canonicalModelTier(product));
    }
  });

  it("legacy products keep their PayPal-tied prices (owner decree)", () => {
    // Starter: $20/mo, $200/yr
    expect(priceFor("starter", 1)).toBe(20);
    expect(priceFor("starter", 12)).toBe(200);
    // Elite: $40/mo, $400/yr
    expect(priceFor("elite", 1)).toBe(40);
    expect(priceFor("elite", 12)).toBe(400);
  });

  it("legacy tiers still resolve via getTier (checkout needs them)", () => {
    expect(getTier("starter")).toBeDefined();
    expect(getTier("elite")).toBeDefined();
  });

  it("canonical tier of a legacy product differs from its price source — Starter pays $20, gets premium", () => {
    // The invariant that matters at activation: the AMOUNT charged comes
    // from the product id, the SUBSCRIPTION row from the canonical id.
    const product = "starter";
    const charged = priceFor(product as TierId, 1);
    const writtenTier = canonicalModelTier(product);
    expect(charged).toBe(20);
    expect(writtenTier).toBe("premium");
    // And premium's own price stays untouched at $14.99 (memberships.ts)
    // so the two price systems never contaminate each other: premium is
    // NOT a legacy plans.ts product, so priceFor must not resolve it.
    expect(priceFor("premium" as TierId, 1)).toBeNull();
  });
});
