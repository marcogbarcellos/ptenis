import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";

export default async function JogadoresPage() {
  await requireUser();
  const jogadores = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ level: "desc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jogadores ({jogadores.length})</h1>
      <div className="divide-y rounded-2xl border bg-card">
        {jogadores.map((j) => (
          <Link key={j.id} href={`/jogadores/${j.id}`} className="flex items-center gap-3 p-3">
            <AvatarIniciais nome={j.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{j.name}</p>
              {Array.isArray(j.availability) && j.availability.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  Joga: {(j.availability as string[]).join(" · ")}
                </p>
              )}
            </div>
            <NivelBadge nivel={j.level} />
          </Link>
        ))}
      </div>
    </div>
  );
}
