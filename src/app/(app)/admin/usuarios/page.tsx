import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/current-user";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { UsuarioControles } from "./controles";

export default async function AdminUsuariosPage() {
  const eu = await requireAdmin();
  const usuarios = await db.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Usuários ({usuarios.length})</h1>
      <div className="divide-y rounded-2xl border bg-card">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-3">
            <AvatarIniciais nome={u.name} className={u.isActive ? "" : "opacity-40"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.name} {u.isAdmin && "👑"} {!u.isActive && <span className="text-xs text-destructive">(desativado)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.phone} · {u.email}</p>
            </div>
            <UsuarioControles userId={u.id} nivel={u.level} isAdmin={u.isAdmin}
              isActive={u.isActive} souEu={u.id === eu.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
