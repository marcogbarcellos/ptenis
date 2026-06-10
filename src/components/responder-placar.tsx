"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { confirmarPlacarAction, contestarPlacarAction } from "@/app/(app)/actions";

export function ResponderPlacar({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={pending}
        onClick={() => start(async () => {
          const r = await confirmarPlacarAction(matchId);
          if (r.ok) toast.success("Placar confirmado!");
          else if (r.error) toast.error(r.error);
        })}>
        Confirmar placar
      </Button>
      <ConfirmButton titulo="Contestar placar?"
        descricao="O placar lançado será descartado e o jogo volta para 'marcado'. Persistindo a divergência, o admin resolve."
        acao={() => contestarPlacarAction(matchId)}>
        Contestar
      </ConfirmButton>
    </div>
  );
}
