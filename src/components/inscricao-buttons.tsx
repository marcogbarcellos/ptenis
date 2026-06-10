"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarInscricaoAction, inscreverAction } from "@/app/(app)/temporada/actions";

export function InscricaoButtons({ seasonId, inscrito }: { seasonId: string; inscrito: boolean }) {
  const [pending, start] = useTransition();
  const agir = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn(seasonId);
      if (r.ok) toast.success(msg);
      else if (r.error) toast.error(r.error);
    });
  return inscrito ? (
    <Button variant="outline" className="w-full" disabled={pending}
      onClick={() => agir(cancelarInscricaoAction, "Inscrição cancelada.")}>
      Inscrito ✓ — toque para cancelar
    </Button>
  ) : (
    <Button className="w-full font-semibold" disabled={pending}
      onClick={() => agir(inscreverAction, "Você está dentro! 🎾")}>
      Quero disputar!
    </Button>
  );
}
