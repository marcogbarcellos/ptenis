import { describe, expect, it } from "vitest";
import { normalizarTelefone } from "@/lib/validation/schemas";

describe("normalizarTelefone", () => {
  it("aceita E.164 de qualquer país e limpa formatação", () => {
    expect(normalizarTelefone("+55 (11) 91234-5678")).toBe("+5511912345678");
    expect(normalizarTelefone("+351 912 345 678")).toBe("+351912345678");
    expect(normalizarTelefone("+1 555 123 4567")).toBe("+15551234567");
  });
  it("rejeita número sem código do país (sem +)", () => {
    expect(normalizarTelefone("11912345678")).toBeNull();
    expect(normalizarTelefone("(11) 3123-4567")).toBeNull();
    expect(normalizarTelefone("912345678")).toBeNull();
    expect(normalizarTelefone("011 3123-4567")).toBeNull();
  });
  it("rejeita inválidos", () => {
    expect(normalizarTelefone("123")).toBeNull();
    expect(normalizarTelefone("abc")).toBeNull();
    expect(normalizarTelefone("+123")).toBeNull(); // curto demais (<8 dígitos)
  });
});
