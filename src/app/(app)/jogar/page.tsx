import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { CombinadoForm, ConviteForm } from "./forms";

export default async function JogarPage() {
  const user = await requireUser();
  const jogadores = await db.user.findMany({
    where: { isActive: true, id: { not: user.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true },
  });

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
        <TabsContent value="liga" className="pt-2">
          <EmptyState
            emoji="🏆"
            titulo="Temporadas chegam em breve"
            descricao="Os jogos da liga aparecem aqui quando você estiver numa divisão."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
