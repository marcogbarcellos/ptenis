"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarInscricaoAction, inscreverAction } from "@/app/(app)/temporada/actions";

type Divisao = { id: string; name: string };

export function InscricaoButtons({
  seasonId, inscrito, divisoes = [], preferredDivisionId,
}: {
  seasonId: string;
  inscrito: boolean;
  divisoes?: Divisao[];
  preferredDivisionId?: string | null;
}) {
  const [pending, start] = useTransition();
  const [divId, setDivId] = useState(preferredDivisionId ?? divisoes[0]?.id ?? "");

  if (inscrito) {
    return (
      <div className="space-y-2">
        {divisoes.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
            <span className="text-sm text-muted-foreground">Seu grupo:</span>
            <select value={divId} className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
              onChange={(e) => setDivId(e.target.value)}>
              {divisoes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => start(async () => {
                const r = await inscreverAction(seasonId, divId);
                if (r.ok) toast.success("Grupo atualizado!");
                else if (r.error) toast.error(r.error);
              })}>
              Salvar
            </Button>
          </div>
        )}
        <Button variant="outline" className="w-full" disabled={pending}
          onClick={() => start(async () => {
            const r = await cancelarInscricaoAction(seasonId);
            if (r.ok) toast.success("Inscrição cancelada.");
            else if (r.error) toast.error(r.error);
          })}>
          Inscrito ✓ — toque para cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {divisoes.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Escolha seu grupo</label>
          <select value={divId} className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            onChange={(e) => setDivId(e.target.value)}>
            {divisoes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}
      <Button className="w-full font-semibold" disabled={pending}
        onClick={() => start(async () => {
          const r = await inscreverAction(seasonId, divId || undefined);
          if (r.ok) toast.success("Você está dentro! 🎾");
          else if (r.error) toast.error(r.error);
        })}>
        Quero disputar!
      </Button>
    </div>
  );
}
