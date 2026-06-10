import { describe, expect, it } from "vitest";
import { gerarToken, hashToken } from "@/lib/auth/session";

describe("token de sessão", () => {
  it("gera tokens únicos e longos", () => {
    const a = gerarToken();
    expect(a).not.toBe(gerarToken());
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
  it("hash é determinístico e diferente do token", () => {
    const t = gerarToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
  });
});
