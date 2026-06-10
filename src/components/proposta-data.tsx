"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aceitarPropostaAction, proporDataAction } from "@/app/(app)/actions";

export function PropostaData({ matchId, possoAceitar, contraproposta }: {
  matchId: string;
  possoAceitar: boolean;
  contraproposta: boolean;
}) {
  const [quando, setQuando] = useState("");
  const [local, setLocal] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      {possoAceitar && (
        <Button className="w-full font-semibold" disabled={pending}
          onClick={() => start(async () => {
            const r = await aceitarPropostaAction(matchId);
            if (r.ok) toast.success("Jogo marcado! 🎾");
            else if (r.error) toast.error(r.error);
          })}>
          Aceitar a data proposta
        </Button>
      )}
      <p className="text-sm font-semibold">
        {contraproposta ? (possoAceitar ? "Ou contraproponha outra data" : "Sua proposta — pode trocar") : "Propor data para este confronto"}
      </p>
      <div className="space-y-1">
        <Label htmlFor="quando-prop">Quando</Label>
        <Input id="quando-prop" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="local-prop">Onde (opcional)</Label>
        <Input id="local-prop" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Quadra 1" />
      </div>
      <Button variant={possoAceitar ? "outline" : "default"} className="w-full" disabled={pending}
        onClick={() => start(async () => {
          const r = await proporDataAction(matchId, quando, local);
          if (r.ok) toast.success("Proposta enviada — o adversário recebe por e-mail.");
          else if (r.error) toast.error(r.error);
        })}>
        {contraproposta ? "Enviar contraproposta" : "Enviar proposta"}
      </Button>
    </div>
  );
}
