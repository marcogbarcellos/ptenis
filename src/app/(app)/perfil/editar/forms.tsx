"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarSenhaAction, atualizarPerfilAction } from "../actions";

export const OPCOES_DISPONIBILIDADE = [
  "seg", "ter", "qua", "qui", "sex", "sáb", "dom", "manhã", "tarde", "noite",
];

export function PerfilForm({ nome, telefone, disponibilidade }: {
  nome: string; telefone: string; disponibilidade: string[];
}) {
  const [state, action, pending] = useActionState(atualizarPerfilAction, idle);
  useEffect(() => { if (state.ok) toast.success("Perfil atualizado!"); }, [state]);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="telefone">WhatsApp</Label>
        <Input id="telefone" name="telefone" type="tel" defaultValue={telefone} required />
      </div>
      <div className="space-y-1">
        <Label>Quando você costuma jogar?</Label>
        <div className="flex flex-wrap gap-2">
          {OPCOES_DISPONIBILIDADE.map((o) => (
            <label key={o} className="cursor-pointer">
              <input type="checkbox" name="disponibilidade" value={o}
                defaultChecked={disponibilidade.includes(o)} className="peer sr-only" />
              <span className="inline-block rounded-full border px-3 py-1 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                {o}
              </span>
            </label>
          ))}
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState(alterarSenhaAction, idle);
  useEffect(() => { if (state.ok) toast.success("Senha alterada!"); }, [state]);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="atual">Senha atual</Label>
        <Input id="atual" name="atual" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nova">Nova senha</Label>
        <Input id="nova" name="nova" type="password" autoComplete="new-password" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>Alterar senha</Button>
    </form>
  );
}
