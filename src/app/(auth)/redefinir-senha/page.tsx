import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RedefinirForm } from "./form";

export default async function RedefinirSenhaPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Card>
      <CardHeader><CardTitle>Nova senha</CardTitle></CardHeader>
      <CardContent>
        {token ? <RedefinirForm token={token} /> : <p className="text-sm text-destructive">Link inválido — peça um novo em “Esqueci a senha”.</p>}
      </CardContent>
    </Card>
  );
}
