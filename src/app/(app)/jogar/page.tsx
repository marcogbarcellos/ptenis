import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { getTemporadaAtual } from "@/lib/services/temporada";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { JogoCard } from "@/components/jogo-card";
import { buttonVariants } from "@/components/ui/button";
import { CombinadoForm, ConviteForm } from "./forms";

export default async function JogarPage() {
  const user = await requireUser();
  const { timezone } = await getSettings();
  const jogadores = await db.user.findMany({
    where: { isActive: true, id: { not: user.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true },
  });
  const season = await getTemporadaAtual(db);
  const meusConfrontos = season && ["liga", "playoffs"].includes(season.status)
    ? await db.match.findMany({
        where: {
          seasonId: season.id,
          status: { in: ["pendente", "proposto"] },
          OR: [{ playerAId: user.id }, { playerBId: user.id }],
        },
        include: { playerA: true, playerB: true },
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Puxar um jogo</h1>
      <Tabs defaultValue="aberto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aberto">Convite</TabsTrigger>
          <TabsTrigger value="combinado">Combinado</TabsTrigger>
          <TabsTrigger value="liga">Liga</TabsTrigger>
        </TabsList>
        <TabsContent value="aberto" className="pt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Publica no mural — o primeiro que topar joga com você.
          </p>
          <ConviteForm />
        </TabsContent>
        <TabsContent value="combinado" className="pt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Já achou parceiro (no grupo, por exemplo)? Salva aqui o jogo de vocês.
          </p>
          <CombinadoForm jogadores={jogadores} />
        </TabsContent>
        <TabsContent value="liga" className="space-y-3 pt-2">
          {meusConfrontos.length === 0 ? (
            <EmptyState emoji="🏆" titulo="Nenhum confronto para marcar"
              descricao={season?.status === "inscricoes"
                ? "As inscrições estão abertas na aba Temporada!"
                : "Seus jogos de liga aparecem aqui quando você estiver numa divisão."}>
              <Link href="/temporada" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver temporada
              </Link>
            </EmptyState>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Toque num confronto para propor data.</p>
              {meusConfrontos.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
