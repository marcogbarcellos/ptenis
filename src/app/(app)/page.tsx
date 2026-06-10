import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { JogoCard } from "@/components/jogo-card";
import { AceitarConviteButton } from "@/components/aceitar-convite-button";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default async function InicioPage() {
  const user = await requireUser();
  const { timezone, communityName } = await getSettings();
  const agora = new Date();

  const [pendencias, convites, proximos] = await Promise.all([
    db.match.findMany({
      where: {
        OR: [
          { status: "aguardando_confirmacao", reportedById: { not: user.id }, OR: [{ playerAId: user.id }, { playerBId: user.id }] },
          { status: "proposto", proposedById: { not: user.id }, OR: [{ playerAId: user.id }, { playerBId: user.id }] },
        ],
      },
      include: { playerA: true, playerB: true },
      orderBy: { createdAt: "asc" },
    }),
    db.match.findMany({
      where: { status: "aberto", scheduledAt: { gt: agora }, playerAId: { not: user.id } },
      include: { playerA: true, playerB: true },
      orderBy: { scheduledAt: "asc" },
    }),
    db.match.findMany({
      where: {
        OR: [{ playerAId: user.id }, { playerBId: user.id }],
        status: { in: ["aberto", "marcado", "proposto"] },
        // jogos com data passada saem dos "próximos" (viram histórico/pendência de placar)
        AND: [{ OR: [{ scheduledAt: null }, { scheduledAt: { gte: agora } }] }],
      },
      include: { playerA: true, playerB: true },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{communityName}</p>
        <h1 className="text-xl font-bold">Olá, {user.name.split(" ")[0]}! 🎾</h1>
      </header>

      {pendencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-amber-700">Para você resolver</h2>
          {pendencias.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Convites abertos</h2>
        {convites.length === 0 ? (
          <EmptyState emoji="📭" titulo="Nenhum convite aberto" descricao="Que tal puxar o primeiro jogo?">
            <Link href="/jogar" className={buttonVariants({ size: "sm" })}>Criar convite</Link>
          </EmptyState>
        ) : (
          convites.map((m) => (
            <JogoCard key={m.id} match={m} tz={timezone}>
              <AceitarConviteButton matchId={m.id} />
            </JogoCard>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Seus próximos jogos</h2>
        {proximos.length === 0 ? (
          <EmptyState emoji="🗓️" titulo="Nada marcado ainda" />
        ) : (
          proximos.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)
        )}
      </section>
    </div>
  );
}
