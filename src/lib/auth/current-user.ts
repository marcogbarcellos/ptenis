import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken, validarSessao } from "@/lib/auth/session";

export const getCurrentUser = cache(async () => {
  const token = await getSessionToken();
  if (!token) return null;
  return validarSessao(db, token);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
