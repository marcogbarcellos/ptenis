import Link from "next/link";
import type { Match, User } from "@prisma/client";
import { placarTexto } from "@/lib/format";
import { cn } from "@/lib/utils";

type Jogo = Match & { playerA: User; playerB: User | null };

function LinhaJogador({ nome, vencedor }: { nome?: string; vencedor: boolean }) {
  return (
    <p className={cn("truncate text-sm", vencedor ? "font-bold text-primary" : "text-foreground")}>
      {vencedor && "🏆 "}{nome ?? "A definir"}
    </p>
  );
}

function CardJogo({ jogo, rotulo }: { jogo?: Jogo; rotulo: string }) {
  if (!jogo) {
    return (
      <div className="rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="text-sm text-muted-foreground">Aguardando semifinais…</p>
      </div>
    );
  }
  return (
    <Link href={`/jogo/${jogo.id}`} className="block rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        {jogo.score != null && <p className="text-xs font-semibold">{placarTexto(jogo.score as number[][])}</p>}
        {jogo.status === "wo" && <p className="text-xs">W.O.</p>}
      </div>
      <LinhaJogador nome={jogo.playerA.name} vencedor={jogo.winnerId === jogo.playerAId} />
      <LinhaJogador nome={jogo.playerB?.name} vencedor={!!jogo.winnerId && jogo.winnerId === jogo.playerBId} />
    </Link>
  );
}

export function Bracket({ jogos }: { jogos: Jogo[] }) {
  const semi1 = jogos.find((j) => j.round === "semi1");
  const semi2 = jogos.find((j) => j.round === "semi2");
  const final = jogos.find((j) => j.round === "final");
  const soFinal = !semi1 && !semi2; // divisão pequena: final direta
  return (
    <div className="space-y-2">
      {!soFinal && (
        <div className="grid grid-cols-2 gap-2">
          <CardJogo jogo={semi1} rotulo="Semifinal 1 (1º × 4º)" />
          <CardJogo jogo={semi2} rotulo="Semifinal 2 (2º × 3º)" />
        </div>
      )}
      <CardJogo jogo={final} rotulo={soFinal ? "Final (1º × 2º)" : "Final"} />
    </div>
  );
}
