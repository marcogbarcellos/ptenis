import { describe, expect, it } from "vitest";
import {
  emailAmistosoCombinado,
  emailPlacarParaConfirmar,
  emailPropostaRecebida,
  emailResetSenha,
} from "@/lib/services/notificacoes";

describe("templates de e-mail", () => {
  it("reset de senha contém o link", () => {
    const t = emailResetSenha("https://x/redefinir-senha?token=abc");
    expect(t.html).toContain("token=abc");
    expect(t.subject).toMatch(/senha/i);
  });
  it("eventos de jogo contêm nome e link do jogo", () => {
    for (const t of [
      emailPropostaRecebida("João", "https://x/jogo/1"),
      emailAmistosoCombinado("João", "https://x/jogo/1"),
      emailPlacarParaConfirmar("João", "https://x/jogo/1"),
    ]) {
      expect(t.html).toContain("João");
      expect(t.html).toContain("/jogo/1");
    }
  });
});
