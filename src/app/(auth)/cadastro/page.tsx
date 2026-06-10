import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadastroForm } from "./form";

export default async function CadastroPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <Card>
      <CardHeader><CardTitle>Criar conta</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <CadastroForm />
        <p className="text-center text-sm">
          Já tem conta? <Link className="font-medium text-primary underline" href="/entrar">Entrar</Link>
        </p>
      </CardContent>
    </Card>
  );
}
