import { hash, verify } from "@node-rs/argon2";

export const hashSenha = (senha: string) => hash(senha);
export const verificarSenha = (hashArmazenado: string, senha: string) =>
  verify(hashArmazenado, senha).catch(() => false);
