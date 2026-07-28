import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class merge)", () => {
  it("junta classes truthy e ignora falsy", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });
  it("resolve conflitos do tailwind (última ganha)", () => {
    // tailwind-merge deduplica utilities conflitantes
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-lg")).toBe("text-lg");
  });
  it("preserva classes não conflitantes", () => {
    expect(cn("rounded", "shadow")).toBe("rounded shadow");
  });
});
