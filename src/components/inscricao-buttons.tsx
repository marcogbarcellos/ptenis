"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { descricaoDivisao } from "@/lib/nivel";
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
  const [divId, setDivId] = useState(preferredDivisionId ?? "");

  const temGrupos = divisoes.length > 0;
  const ultima = divisoes[divisoes.length - 1]?.name;

  // Lista de grupos como cards selecionáveis (vai do mais forte, "A", ao mais fraco).
  const grupos = (onPick: (id: string) => void) => (
    <div className="space-y-2">
      {divisoes.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Os grupos vão do mais avançado (<strong className="text-foreground">{divisoes[0].name}</strong>) ao
          iniciante (<strong className="text-foreground">{ultima}</strong>). Escolha onde você se encaixa —
          o professor confirma antes da liga.
        </p>
      )}
      {divisoes.map((d, i) => {
        const ativo = d.id === divId;
        return (
          <button key={d.id} type="button" disabled={pending} onClick={() => onPick(d.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition",
              ativo ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/50",
            )}>
            <span className="min-w-0">
              <span className="block font-semibold">{d.name}</span>
              <span className="block text-sm text-muted-foreground">{descricaoDivisao(i, divisoes.length)}</span>
            </span>
            <span className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border",
              ativo ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
            )}>
              {ativo && <Check className="size-4" />}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (inscrito) {
    return (
      <div className="space-y-3">
        {temGrupos && grupos((id) => {
          setDivId(id);
          start(async () => {
            const r = await inscreverAction(seasonId, id);
            if (r.ok) toast.success("Grupo atualizado!");
            else if (r.error) toast.error(r.error);
          });
        })}
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
    <div className="space-y-3">
      {temGrupos && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Escolha seu grupo</p>
          {grupos(setDivId)}
        </div>
      )}
      <Button className="w-full font-semibold" disabled={pending || (temGrupos && !divId)}
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
