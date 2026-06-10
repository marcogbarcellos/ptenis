import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { statsDoJogador, trofeus } from "@/lib/stats";
import { sairAction } from "@/app/(auth)/actions";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { JogoCard } from "@/components/jogo-card";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function PerfilPage() {
  const user = await requireUser();
  const { timezone } = await getSettings();
  const { historico, total, vitorias, derrotas } = await statsDoJogador(db, user.id);
  const titulos = await trofeus(db, user.id);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <AvatarIniciais nome={user.name} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <NivelBadge nivel={user.level} />
        </div>
        <Link href="/perfil/editar" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Editar
        </Link>
      </header>

      {user.isAdmin && (
        <Link href="/admin" className="block rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="font-semibold text-primary">⚙️ Painel do admin</p>
          <p className="text-sm text-muted-foreground">Temporadas, usuários e configurações</p>
        </Link>
      )}

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

      <section className="space-y-3">
        <h2 className="font-semibold">Seu histórico</h2>
        {historico.length === 0
          ? <EmptyState emoji="🎾" titulo="Ainda sem jogos" descricao="Bora puxar o primeiro na aba Jogar!" />
          : historico.slice(0, 10).map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
      </section>

      <form action={sairAction}>
        <Button type="submit" variant="outline" className="w-full text-muted-foreground">Sair da conta</Button>
      </form>
    </div>
  );
}
