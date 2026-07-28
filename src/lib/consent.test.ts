/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getConsent, setConsent, hasConsent, CONSENT_KEY } from "./consent";

describe("consent (LGPD)", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
  });

  it("getConsent retorna null quando não há registro", () => {
    expect(getConsent()).toBeNull();
    expect(hasConsent()).toBe(false);
  });

  it("setConsent persiste e hasConsent reflete", () => {
    setConsent("accepted");
    expect(hasConsent()).toBe(true);
    expect(getConsent()).toBe("accepted");
    // grava sob a chave documentada — evita quebrar telemetria existente
    expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
  });

  it("setConsent('rejected') marca como respondido mas não aceito", () => {
    setConsent("rejected");
    expect(getConsent()).toBe("rejected");
    expect(hasConsent()).toBe(false);
  });
});
