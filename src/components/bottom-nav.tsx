"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Trophy, User, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const itensBase = [
  { href: "/", icone: Home, rotulo: "Início" },
  { href: "/temporada", icone: Trophy, rotulo: "Temporada" },
  { href: "/jogar", icone: Plus, rotulo: "Jogar", destaque: true },
  { href: "/jogadores", icone: Users, rotulo: "Jogadores" },
  { href: "/perfil", icone: User, rotulo: "Perfil" },
] as const;

const itemAdmin = { href: "/admin/temporadas", icone: ShieldCheck, rotulo: "Admin" } as const;

export function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const itens = isAdmin ? [...itensBase, itemAdmin] : itensBase;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {itens.map(({ href, icone: Icone, rotulo, ...i }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          if ("destaque" in i && i.destaque) {
            return (
              <Link key={href} href={href} aria-label={rotulo}
                className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Icone className="size-7" />
              </Link>
            );
          }
          return (
            <Link key={href} href={href}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-2 text-[11px]",
                ativo ? "text-primary" : "text-muted-foreground")}>
              <Icone className="size-5" />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
