"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { indiceDivisaoPorNivel } from "@/lib/divisoes";
import { ajustarNivelAction, iniciarLigaAction } from "../../actions";

type Inscrito = { id: string; name: string; level: number; preferredDivisionId?: string | null };
type DivisaoPre = { id: string; name: string; order: number };

export function DivisoesEditor({ seasonId, inscritos, sugestao, divisoesPre = [] }: {
  seasonId: string;
  inscritos: Inscrito[];
  sugestao: { name: string; userIds: string[] }[];
  divisoesPre?: DivisaoPre[];
}) {
  const initialQtd = divisoesPre.length > 0 ? divisoesPre.length : Math.max(1, sugestao.length);
  const [qtd, setQtd] = useState(Math.max(1, initialQtd));
  const [atrib, setAtrib] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    // Prioridade 1: divisão preferida do jogador (vinda do nível no cadastro via link)
    if (divisoesPre.length > 0) {
      inscritos.forEach((j) => {
        if (j.preferredDivisionId) {
          const idx = divisoesPre.findIndex((d) => d.id === j.preferredDivisionId);
          if (idx >= 0) { m[j.id] = idx; return; }
        }
      });
    }
    // Prioridade 2: sugestão do algoritmo
    sugestao.forEach((d, i) => d.userIds.forEach((u) => { if (!(u in m)) m[u] = i; }));
    // Padrão: grupo 0
    inscritos.forEach((j) => { if (!(j.id in m)) m[j.id] = 0; });
    return m;
  });
  const [niveis, setNiveis] = useState<Record<string, number>>(
    () => Object.fromEntries(inscritos.map((j) => [j.id, j.level]))
  );
  const [busca, setBusca] = useState("");
  const [colapsados, setColapsados] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const [, startNivel] = useTransition();

  const filtro = busca.trim().toLowerCase();

  const divisoes = Array.from({ length: qtd }, (_, i) => ({
    name: divisoesPre[i]?.name ?? `Divisão ${String.fromCharCode(65 + i)}`,
    userIds: inscritos.filter((j) => (atrib[j.id] ?? 0) === i).map((j) => j.id),
  }));

  function mudarNivel(userId: string, nivel: number) {
    setNiveis((prev) => ({ ...prev, [userId]: nivel }));
    startNivel(async () => {
      const r = await ajustarNivelAction(userId, nivel);
      if (!r.ok && r.error) toast.error(r.error);
    });
  }

  function reSugerirPorNivel() {
    setAtrib(() => {
      const m: Record<string, number> = {};
      inscritos.forEach((j) => { m[j.id] = indiceDivisaoPorNivel(niveis[j.id] ?? j.level, qtd); });
      return m;
    });
    toast.success("Grupos re-sugeridos pelos níveis.");
  }

  function toggleColapso(i: number) {
    setColapsados((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

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
          <Button size="sm" variant="outline" onClick={() => setQtd((q) => Math.min(7, q + 1))}>+</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar jogador…" className="pl-8" />
        </div>
        <Button size="sm" variant="outline" onClick={reSugerirPorNivel} className="shrink-0">
          Re-sugerir por nível
        </Button>
      </div>

      {divisoes.map((d, i) => {
        const jogadores = inscritos.filter((j) => (atrib[j.id] ?? 0) === i);
        const visiveis = filtro ? jogadores.filter((j) => j.name.toLowerCase().includes(filtro)) : jogadores;
        const colapsado = filtro ? false : colapsados.has(i);
        return (
          <div key={i} className="space-y-2 rounded-2xl border bg-card p-3">
            <button type="button" onClick={() => toggleColapso(i)}
              className="flex w-full items-center gap-1 text-left text-sm font-semibold">
              {colapsado ? <ChevronRight className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
              <span>
                {d.name} <span className="font-normal text-muted-foreground">({jogadores.length} jogadores)</span>
                {jogadores.length > 12 && <span className="text-destructive"> — grande demais!</span>}
                {jogadores.length === 1 && <span className="font-normal text-muted-foreground"> — será ignorado (mín. 2)</span>}
                {jogadores.length === 0 && <span className="font-normal text-muted-foreground"> — vazio, será ignorado</span>}
              </span>
            </button>
            {!colapsado && visiveis.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{j.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <select value={niveis[j.id] ?? j.level} aria-label={`Nível de ${j.name}`}
                    className="rounded-lg border bg-background p-1 text-xs"
                    onChange={(e) => mudarNivel(j.id, Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>N{n}</option>)}
                  </select>
                  <select value={i} aria-label={`Grupo de ${j.name}`}
                    className="rounded-lg border bg-background p-1 text-xs"
                    onChange={(e) => setAtrib((prev) => ({ ...prev, [j.id]: Number(e.target.value) }))}>
                    {Array.from({ length: qtd }, (_, k) => (
                      <option key={k} value={k}>{String.fromCharCode(65 + k)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {!colapsado && filtro && visiveis.length === 0 && jogadores.length > 0 && (
              <p className="text-xs text-muted-foreground">Ninguém deste grupo bate com a busca.</p>
            )}
          </div>
        );
      })}

      <Button className="w-full font-semibold" disabled={pending} onClick={enviar}>
        {pending ? "Gerando…" : "Confirmar divisões e começar a liga"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Mudar o nível salva no perfil do jogador (e vale pra próxima liga). Confirmar gera todos os confrontos
        (todos contra todos em cada divisão) e fecha as inscrições. Não dá para desfazer pelo app.
      </p>
    </div>
  );
}
