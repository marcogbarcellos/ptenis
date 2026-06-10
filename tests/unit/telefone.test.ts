import { describe, expect, it } from "vitest";
import { normalizarTelefone } from "@/lib/validation/schemas";

describe("normalizarTelefone", () => {
  it("aceita E.164 e limpa formatação", () => {
    expect(normalizarTelefone("+55 (11) 91234-5678")).toBe("+5511912345678");
    expect(normalizarTelefone("+351 912 345 678")).toBe("+351912345678");
  });
  it("assume +55 para números locais de 10-11 dígitos", () => {
    expect(normalizarTelefone("11912345678")).toBe("+5511912345678");
    expect(normalizarTelefone("(11) 3123-4567")).toBe("+551131234567");
  });
  it("rejeita inválidos", () => {
    expect(normalizarTelefone("123")).toBeNull();
    expect(normalizarTelefone("abc")).toBeNull();
  });
  it("rejeita número local com zero de tronco", () => {
    expect(normalizarTelefone("011 3123-4567")).toBeNull();
  });
});
