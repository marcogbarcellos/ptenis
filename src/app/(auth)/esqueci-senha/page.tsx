import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EsqueciForm } from "./form";

export default function EsqueciSenhaPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Esqueci minha senha</CardTitle></CardHeader>
      <CardContent><EsqueciForm /></CardContent>
    </Card>
  );
}
