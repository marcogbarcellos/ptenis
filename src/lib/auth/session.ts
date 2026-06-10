import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { Db } from "@/lib/db";

const COOKIE = "ptenis_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export const gerarToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function criarSessao(db: Db, userId: string) {
  const token = gerarToken();
  await db.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  return token;
}

export async function validarSessao(db: Db, token: string) {
  const s = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!s || s.expiresAt < new Date() || !s.user.isActive) return null;
  if (s.expiresAt.getTime() - Date.now() < TTL_MS / 2) {
    await db.session.update({
      where: { id: s.id },
      data: { expiresAt: new Date(Date.now() + TTL_MS) },
    });
  }
  return s.user;
}

export async function destruirSessao(db: Db, token: string) {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}
export async function getSessionToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}
