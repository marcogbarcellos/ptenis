"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aceitarConviteAction } from "@/app/(app)/actions";

export function AceitarConviteButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full font-semibold"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await aceitarConviteAction(matchId);
          if (r.ok) toast.success("Jogo marcado! 🎾");
          else if (r.error) toast.error(r.error);
        })
      }
    >
      {pending ? "Entrando…" : "Topo jogar!"}
    </Button>
  );
}
