import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { headToHead, statsDoJogador, trofeus } from "@/lib/stats";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { JogoCard } from "@/components/jogo-card";
import { EmptyState } from "@/components/empty-state";

export default async function PerfilPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eu = await requireUser();
  const { timezone } = await getSettings();
  const jogador = await db.user.findUnique({ where: { id, isActive: true } });
  if (!jogador) notFound();

  const { jogos, historico, total, vitorias, derrotas } = await statsDoJogador(db, jogador.id);
  const h2h = eu.id !== jogador.id ? headToHead(jogos, eu.id, jogador.id) : null;
  const titulos = await trofeus(db, jogador.id);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <AvatarIniciais nome={jogador.name} className="size-16 text-xl" />
        <div>
          <h1 className="text-xl font-bold">{jogador.name}</h1>
          <NivelBadge nivel={jogador.level} />
        </div>
      </header>

      {titulos.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-accent p-4">
          {titulos.map((t) => (
            <p key={t.divisionId} className="text-sm font-semibold text-accent-foreground">
              🏆 Campeão {t.division.name} — {t.division.season.name}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        {[{ n: total, l: "jogos" }, { n: vitorias, l: "vitórias" }, { n: derrotas, l: "derrotas" }].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-3">
            <p className="text-2xl font-bold text-primary">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {h2h && h2h.total > 0 && (
        <p className="rounded-2xl border bg-card p-4 text-center text-sm">
          Contra você: <strong>{h2h.dele} × {h2h.minhas}</strong> em {h2h.total} jogo{h2h.total > 1 ? "s" : ""}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Últimos jogos</h2>
        {historico.length === 0
          ? <EmptyState emoji="🎾" titulo="Ainda sem jogos" />
          : historico.slice(0, 10).map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
      </section>
    </div>
  );
}
