import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntrarForm } from "./form";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ redefinida?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { redefinida } = await searchParams;
  return (
    <Card>
      <CardHeader><CardTitle>Entrar</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {redefinida && <p className="text-sm text-primary">Senha redefinida! Entre com a nova senha.</p>}
        <EntrarForm />
        <div className="flex justify-between text-sm">
          <Link className="text-muted-foreground underline" href="/esqueci-senha">Esqueci a senha</Link>
          <Link className="font-medium text-primary underline" href="/cadastro">Criar conta</Link>
        </div>
      </CardContent>
    </Card>
  );
}
