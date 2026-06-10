// Fail-fast: se uma var crítica faltar, o boot quebra antes de qualquer request
// em vez de produzir erros obscuros mais tarde.
function require(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return v;
}

export const DATABASE_URL = require("DATABASE_URL");

// APP_URL é obrigatória em produção (usada nos e-mails de reset de senha).
// Em dev, cai no padrão silenciosamente.
export const APP_URL =
  process.env.APP_URL ??
  (process.env.NODE_ENV === "production"
    ? require("APP_URL") // relança com mensagem clara
    : "http://localhost:3000");
