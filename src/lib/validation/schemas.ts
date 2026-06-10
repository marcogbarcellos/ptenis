import { z } from "zod";

export function normalizarTelefone(raw: string): string | null {
  const limpo = raw.replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(limpo)) return limpo;
  if (/^\d{10,11}$/.test(limpo)) return `+55${limpo}`;
  return null;
}

export const telefoneSchema = z
  .string()
  .transform((v, ctx) => {
    const t = normalizarTelefone(v);
    if (!t) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número (ex.: 11 91234-5678)." });
      return z.NEVER;
    }
    return t;
  });

export const senhaSchema = z.string().min(6, "A senha precisa de pelo menos 6 caracteres.");

export const cadastroSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código de convite."),
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  telefone: telefoneSchema,
  senha: senhaSchema,
  respostas: z.array(z.coerce.number().min(1).max(4)).length(4, "Responda as 4 perguntas."),
});

export const entrarSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: telefoneSchema,
  availability: z.array(z.string()).optional(),
});
