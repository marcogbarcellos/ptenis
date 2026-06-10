"use client";
import { useActionState } from "react";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarTemporadaAction } from "../actions";

export function NovaTemporadaForm() {
  const [state, action, pending] = useActionState(criarTemporadaAction, idle);
  return (
    <form action={action} className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="font-semibold">Nova temporada</p>
      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" placeholder="Ex.: Temporada Inverno 2026" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="inscricoesAte">Inscrições até</Label>
          <Input id="inscricoesAte" name="inscricoesAte" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ligaAte">Liga até</Label>
          <Input id="ligaAte" name="ligaAte" type="date" />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">Criar (fica em rascunho)</Button>
    </form>
  );
}
