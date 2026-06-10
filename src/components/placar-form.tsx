"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { MatchFormat } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lancarPlacarAction } from "@/app/(app)/actions";

export function PlacarForm({ matchId, format, nomeA, nomeB }: {
  matchId: string; format: MatchFormat; nomeA: string; nomeB: string;
}) {
  const linhas = format === "bo3_mtb" ? [0, 1, 2] : [0];
  const [valores, setValores] = useState<string[][]>(linhas.map(() => ["", ""]));
  const [pending, start] = useTransition();

  function enviar() {
    const sets = valores
      .filter(([a, b]) => a !== "" && b !== "")
      .map(([a, b]) => [Number(a), Number(b)]);
    start(async () => {
      const r = await lancarPlacarAction(matchId, sets);
      if (r.ok) toast.success("Placar lançado! O adversário tem 48h para confirmar.");
      else if (r.error) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="font-semibold">Lançar placar</p>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
        <span />
        <span className="w-14 text-center text-muted-foreground">{nomeA.split(" ")[0]}</span>
        <span className="w-14 text-center text-muted-foreground">{nomeB.split(" ")[0]}</span>
        {linhas.map((i) => (
          <FragmentoSet key={i} rotulo={format === "bo3_mtb" && i === 2 ? "Match TB" : `Set ${i + 1}`}
            valores={valores[i]}
            onChange={(lado, v) =>
              setValores((prev) => prev.map((linha, j) => (j === i ? linha.map((x, k) => (k === lado ? v : x)) as string[] : linha)))
            } />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Deixe em branco os sets que não aconteceram.</p>
      <Button className="w-full" onClick={enviar} disabled={pending}>
        {pending ? "Enviando…" : "Enviar placar"}
      </Button>
    </div>
  );
}

function FragmentoSet({ rotulo, valores, onChange }: {
  rotulo: string; valores: string[]; onChange: (lado: number, v: string) => void;
}) {
  return (
    <>
      <span className="text-muted-foreground">{rotulo}</span>
      {[0, 1].map((lado) => (
        <Input key={lado} type="number" inputMode="numeric" min={0} max={30}
          className="w-14 text-center" value={valores[lado]}
          onChange={(e) => onChange(lado, e.target.value)} />
      ))}
    </>
  );
}
