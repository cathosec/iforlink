import { describe, it, expect } from "vitest";
import { computeCampaignFees, mpFeeForMethod, MP_DEFAULT_FEES } from "./fees";

describe("computeCampaignFees", () => {
  it("retorna zero para base inválida", () => {
    for (const b of [0, -100, NaN]) {
      const r = computeCampaignFees({
        baseCents: b as number, feePct: 2, minFeeCents: 50,
        mpPct: 0.99, passToSupporter: true,
      });
      expect(r).toEqual({
        base: 0, total: 0, feeForLink: 0, feeMp: 0, netCreator: 0, addedToSupporter: 0,
      });
    }
  });

  it("piso mínimo da comissão ForLink é respeitado", () => {
    const r = computeCampaignFees({
      baseCents: 1000, feePct: 2, minFeeCents: 50,
      mpPct: 0, passToSupporter: false,
    });
    // 2% de R$10 = 20 cents, mas piso é 50
    expect(r.feeForLink).toBe(50);
    expect(r.netCreator).toBe(950);
  });

  it("percentual usado quando maior que o piso", () => {
    const r = computeCampaignFees({
      baseCents: 10_000, feePct: 2, minFeeCents: 50,
      mpPct: 0, passToSupporter: false,
    });
    expect(r.feeForLink).toBe(200);
    expect(r.netCreator).toBe(9800);
  });

  it("passToSupporter=false: taxas são deduzidas do repasse", () => {
    const r = computeCampaignFees({
      baseCents: 10_000, feePct: 2, minFeeCents: 50,
      mpPct: 0.99, passToSupporter: false,
    });
    expect(r.total).toBe(10_000);
    expect(r.feeForLink).toBe(200);
    expect(r.feeMp).toBe(99); // 0.99% de 10000
    expect(r.netCreator).toBe(10_000 - 200 - 99);
    expect(r.addedToSupporter).toBe(0);
  });

  it("passToSupporter=true: criador recebe exatamente a base (PIX)", () => {
    const base = 10_000;
    const r = computeCampaignFees({
      baseCents: base, feePct: 2, minFeeCents: 50,
      mpPct: 0.99, passToSupporter: true,
    });
    expect(r.netCreator).toBe(base);
    expect(r.total).toBeGreaterThan(base + r.feeForLink);
    expect(r.addedToSupporter).toBe(r.total - base);
    // reconstrução: total - feeMp - feeForLink ≈ base (tolerando 1 cent de arredondamento)
    const reconstructed = r.total - r.feeMp - r.feeForLink;
    expect(Math.abs(reconstructed - base)).toBeLessThanOrEqual(1);
  });

  it("passToSupporter=true com cartão: inclui fixo MP", () => {
    const base = 10_000;
    const r = computeCampaignFees({
      baseCents: base, feePct: 2, minFeeCents: 50,
      mpPct: 4.98, mpFixedCents: 39, passToSupporter: true,
    });
    expect(r.netCreator).toBe(base);
    // total ≈ ceil((10000 + 200 + 39) / (1 - 0.0498))
    expect(r.total).toBe(Math.ceil((base + 200 + 39) / (1 - 0.0498)));
    const reconstructed = r.total - r.feeMp - r.feeForLink;
    expect(Math.abs(reconstructed - base)).toBeLessThanOrEqual(1);
  });

  it("mpPct=100 é clampeado para não dividir por zero", () => {
    const r = computeCampaignFees({
      baseCents: 1000, feePct: 0, minFeeCents: 0,
      mpPct: 100, passToSupporter: true,
    });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBeGreaterThan(0);
  });

  it("valores fracionários de entrada são normalizados via floor", () => {
    const r = computeCampaignFees({
      baseCents: 1000.9, feePct: 0, minFeeCents: 0,
      mpPct: 0, passToSupporter: false,
    });
    expect(r.base).toBe(1000);
  });
});

describe("mpFeeForMethod", () => {
  it("pix usa fee padrão quando não configurado", () => {
    expect(mpFeeForMethod("pix", {})).toEqual({
      mpPct: MP_DEFAULT_FEES.pixPct, mpFixedCents: 0,
    });
  });

  it("card respeita overrides do admin", () => {
    expect(mpFeeForMethod("card", {
      mp_fee_card_percent: 3.5, mp_fee_card_fixed_cents: 50,
    })).toEqual({ mpPct: 3.5, mpFixedCents: 50 });
  });

  it("card cai no default quando ausente", () => {
    expect(mpFeeForMethod("card", {})).toEqual({
      mpPct: MP_DEFAULT_FEES.cardPct, mpFixedCents: MP_DEFAULT_FEES.cardFixedCents,
    });
  });
});
