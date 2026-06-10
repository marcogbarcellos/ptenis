import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  const [usuarios, aguardando, temporada] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.match.count({ where: { status: "aguardando_confirmacao" } }),
    db.season.findFirst({ where: { status: { not: "encerrada" } }, orderBy: { createdAt: "desc" } }),
  ]);
  const itens = [
    { href: "/admin/temporadas", titulo: "Temporadas", info: temporada ? `${temporada.name} — ${temporada.status}` : "nenhuma ativa" },
    { href: "/admin/usuarios", titulo: "Usuários", info: `${usuarios} ativos` },
    { href: "/admin/config", titulo: "Configurações", info: "código de convite, fuso, nome" },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Painel do admin</h1>
      {aguardando > 0 && <p className="text-sm text-amber-700">{aguardando} placar(es) aguardando confirmação.</p>}
      {itens.map((i) => (
        <Link key={i.href} href={i.href}>
          <Card className="mb-2"><CardContent className="p-4">
            <p className="font-semibold">{i.titulo}</p>
            <p className="text-sm text-muted-foreground">{i.info}</p>
          </CardContent></Card>
        </Link>
      ))}
    </div>
  );
}
