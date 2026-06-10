import { describe, expect, it } from "vitest";
import { corAvatar, formatarDataHora, iniciais, placarTexto } from "@/lib/format";

describe("format", () => {
  it("iniciais e cor estável por nome", () => {
    expect(iniciais("Ana Clara Souza")).toBe("AS");
    expect(iniciais("João")).toBe("J");
    expect(corAvatar("João")).toBe(corAvatar("João"));
  });
  it("data/hora em pt-BR no fuso", () => {
    const s = formatarDataHora(new Date("2026-06-13T13:00:00Z"), "America/Sao_Paulo");
    expect(s).toMatch(/s[áa]b/i);
    expect(s).toContain("10:00");
  });
  it("placar em texto", () => {
    expect(placarTexto([[6, 4], [3, 6], [10, 7]])).toBe("6/4 3/6 [10-7]");
    expect(placarTexto([[8, 6]])).toBe("8/6");
  });
});
