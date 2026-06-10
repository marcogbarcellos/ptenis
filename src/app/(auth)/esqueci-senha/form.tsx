"use client";
import { useActionState } from "react";
import { esqueciSenhaAction } from "../actions";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EsqueciForm() {
  const [state, action, pending] = useActionState(esqueciSenhaAction, idle);
  if (state.ok)
    return <p className="text-sm text-primary">Se o e-mail existir, mandamos o link — vale 1 hora. Confira a caixa de entrada.</p>;
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail da conta</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Enviando…" : "Enviar link"}</Button>
    </form>
  );
}
