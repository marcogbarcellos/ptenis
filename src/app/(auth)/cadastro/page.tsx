import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadastroForm } from "./form";

export default async function CadastroPage({ searchParams }: {
  searchParams: Promise<{ c?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { c } = await searchParams;
  const { inviteCode } = await getSettings();
  const convidado = !!c && c.trim().toUpperCase() === inviteCode.toUpperCase();
  return (
    <Card>
      <CardHeader><CardTitle>Criar conta</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <CadastroForm codigoConvite={convidado ? c!.trim() : ""} />
        <p className="text-center text-sm">
          Já tem conta? <Link className="font-medium text-primary underline" href="/entrar">Entrar</Link>
        </p>
      </CardContent>
    </Card>
  );
}
