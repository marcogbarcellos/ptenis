import Link from "next/link";
import { db } from "@/lib/db";
import { NovaTemporadaForm } from "./nova-form";

export default async function AdminTemporadasPage() {
  const temporadas = await db.season.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Temporadas</h1>
      <NovaTemporadaForm />
      <div className="divide-y rounded-2xl border bg-card">
        {temporadas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma ainda.</p>}
        {temporadas.map((t) => (
          <Link key={t.id} href={`/admin/temporadas/${t.id}`} className="flex justify-between p-3">
            <span className="font-medium">{t.name}</span>
            <span className="text-sm text-muted-foreground">{t.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
