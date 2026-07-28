import { describe, it, expect } from "vitest";
import { getFaviconUrl, normalizeUrl } from "./favicon";

describe("normalizeUrl", () => {
  it("mantém http/https intactos", () => {
    expect(normalizeUrl("https://a.com")).toBe("https://a.com");
    expect(normalizeUrl("http://a.com")).toBe("http://a.com");
  });
  it("adiciona https:// quando ausente", () => {
    expect(normalizeUrl("a.com")).toBe("https://a.com");
  });
  it("passa vazio adiante", () => {
    expect(normalizeUrl("")).toBe("");
  });
});

describe("getFaviconUrl", () => {
  it("resolve host e monta URL do google s2", () => {
    expect(getFaviconUrl("https://exemplo.com/foo")).toBe(
      "https://www.google.com/s2/favicons?sz=64&domain=exemplo.com",
    );
  });
  it("aceita host sem protocolo", () => {
    expect(getFaviconUrl("exemplo.com")).toContain("domain=exemplo.com");
  });
  it("respeita size customizado", () => {
    expect(getFaviconUrl("exemplo.com", 128)).toContain("sz=128");
  });
  it("retorna null para URL inválida", () => {
    expect(getFaviconUrl("::não é url::")).toBeNull();
  });
});
