import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="font-semibold text-primary">⚙️ Admin</Link>
        <span>·</span>
        <Link href="/admin/temporadas">Temporadas</Link>
        <span>·</span>
        <Link href="/admin/usuarios">Usuários</Link>
        <span>·</span>
        <Link href="/admin/config">Config</Link>
      </div>
      {children}
    </div>
  );
}
