"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { iniciarLigaAction } from "../../actions";

type Inscrito = { id: string; name: string; level: number };

export function DivisoesEditor({ seasonId, inscritos, sugestao }: {
  seasonId: string;
  inscritos: Inscrito[];
  sugestao: { name: string; userIds: string[] }[];
}) {
  const [qtd, setQtd] = useState(Math.max(1, sugestao.length));
  const [atrib, setAtrib] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    sugestao.forEach((d, i) => d.userIds.forEach((u) => { m[u] = i; }));
    inscritos.forEach((j) => { if (!(j.id in m)) m[j.id] = 0; });
    return m;
  });
  const [pending, start] = useTransition();

  const divisoes = Array.from({ length: qtd }, (_, i) => ({
    name: `Divisão ${String.fromCharCode(65 + i)}`,
    userIds: inscritos.filter((j) => (atrib[j.id] ?? 0) === i).map((j) => j.id),
  }));

  function enviar() {
    start(async () => {
      const r = await iniciarLigaAction(seasonId, divisoes);
      if (r.ok) toast.success("Liga começou! Confrontos gerados. 🎾");
      else if (r.error) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Divisões ({inscritos.length} inscritos)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setQtd((q) => Math.max(1, q - 1))}>−</Button>
          <Button size="sm" variant="outline" onClick={() => setQtd((q) => Math.min(6, q + 1))}>+</Button>
        </div>
      </div>
      {divisoes.map((d, i) => (
        <div key={i} className="space-y-2 rounded-2xl border bg-card p-3">
          <p className="text-sm font-semibold">
            {d.name} <span className="font-normal text-muted-foreground">({d.userIds.length} jogadores)</span>
            {d.userIds.length > 12 && <span className="text-destructive"> — grande demais, round-robin pesado!</span>}
            {d.userIds.length > 0 && d.userIds.length < 2 && <span className="text-destructive"> — mínimo 2</span>}
          </p>
          {inscritos.filter((j) => (atrib[j.id] ?? 0) === i).map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{j.name} <span className="text-muted-foreground">N{j.level}</span></span>
              <select value={i} className="rounded-lg border bg-background p-1 text-xs"
                onChange={(e) => setAtrib((prev) => ({ ...prev, [j.id]: Number(e.target.value) }))}>
                {Array.from({ length: qtd }, (_, k) => (
                  <option key={k} value={k}>{String.fromCharCode(65 + k)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
      <Button className="w-full font-semibold" disabled={pending} onClick={enviar}>
        {pending ? "Gerando…" : "Confirmar divisões e começar a liga"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Isso gera todos os confrontos (todos contra todos em cada divisão) e fecha as inscrições. Não dá para desfazer pelo app.
      </p>
    </div>
  );
}
