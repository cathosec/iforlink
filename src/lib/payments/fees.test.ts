import { describe, it, expect } from "vitest";
import { computeCampaignFees } from "./fees";

describe("computeCampaignFees", () => {
  it("retorna zeros quando base é 0", () => {
    const r = computeCampaignFees({ baseCents: 0, feePct: 2, minFeeCents: 50, mpPct: 0.99, passToSupporter: false });
    expect(r.total).toBe(0);
    expect(r.feeForLink).toBe(0);
    expect(r.feeMp).toBe(0);
  });

  it("PIX absorvido: criador paga taxas", () => {
    // R$10, ForLink 2% (mín R$0,50), MP 0,99%
    const r = computeCampaignFees({ baseCents: 1000, feePct: 2, minFeeCents: 50, mpPct: 0.99, passToSupporter: false });
    expect(r.total).toBe(1000);
    expect(r.feeForLink).toBe(50); // max(50, 20) = 50
    expect(r.feeMp).toBe(10);      // round(1000 * 0.0099)
    expect(r.netCreator).toBe(940);
    expect(r.addedToSupporter).toBe(0);
  });

  it("PIX repassado: apoiador paga tudo, criador recebe base cheia", () => {
    const r = computeCampaignFees({ baseCents: 1000, feePct: 2, minFeeCents: 50, mpPct: 0.99, passToSupporter: true });
    expect(r.netCreator).toBe(1000);
    expect(r.total).toBeGreaterThan(1000);
    // Verifica invariante: total - feeMp - feeForLink >= base
    expect(r.total - r.feeMp - r.feeForLink).toBeGreaterThanOrEqual(1000);
  });

  it("Cartão absorvido", () => {
    const r = computeCampaignFees({ baseCents: 10000, feePct: 2, minFeeCents: 50, mpPct: 4.98, passToSupporter: false });
    expect(r.total).toBe(10000);
    expect(r.feeMp).toBe(498);
    expect(r.feeForLink).toBe(200);
    expect(r.netCreator).toBe(9302);
  });

  it("Cartão repassado", () => {
    const r = computeCampaignFees({ baseCents: 10000, feePct: 2, minFeeCents: 50, mpPct: 4.98, passToSupporter: true });
    expect(r.netCreator).toBe(10000);
    expect(r.total - r.feeMp - r.feeForLink).toBeGreaterThanOrEqual(10000);
  });
});
