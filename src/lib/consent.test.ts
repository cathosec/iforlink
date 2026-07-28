/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getConsent, setConsent, acceptAll, rejectNonEssential,
  hasAdsConsent, hasAnalyticsConsent,
} from "./consent";

describe("consent (LGPD)", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
  });

  it("sem registro, tudo é nulo/falso", () => {
    expect(getConsent()).toBeNull();
    expect(hasAdsConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("acceptAll marca ads e analytics", () => {
    acceptAll();
    const s = getConsent();
    expect(s?.essential).toBe(true);
    expect(s?.analytics).toBe(true);
    expect(s?.ads).toBe(true);
    expect(hasAdsConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("rejectNonEssential mantém essential=true e desliga o resto", () => {
    rejectNonEssential();
    const s = getConsent();
    expect(s?.essential).toBe(true);
    expect(s?.analytics).toBe(false);
    expect(s?.ads).toBe(false);
  });

  it("setConsent parcial preserva o valor anterior do outro campo", () => {
    acceptAll();
    setConsent({ ads: false });
    expect(hasAdsConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("carimba versão e timestamp", () => {
    const before = Date.now();
    acceptAll();
    const s = getConsent()!;
    expect(s.v).toBe(1);
    expect(s.ts).toBeGreaterThanOrEqual(before);
  });
});
