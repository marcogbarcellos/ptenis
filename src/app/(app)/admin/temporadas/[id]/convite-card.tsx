"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConviteCard({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      toast.success("Link copiado! Cole no WhatsApp dos alunos.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não consegui copiar — segure no link para copiar manualmente.");
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="text-sm font-semibold">Link de convite</p>
      <p className="text-xs text-muted-foreground">
        Mande pros alunos. Quem se cadastrar por ele já cai na liga (num grupo provisório pelo nível)
        enquanto as inscrições estiverem abertas.
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border bg-background px-3 py-2 text-xs">{link}</code>
        <Button size="sm" onClick={copiar} className="shrink-0">
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span className="ml-1">{copiado ? "Copiado" : "Copiar"}</span>
        </Button>
      </div>
    </div>
  );
}
