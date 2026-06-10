"use client";
import { useActionState } from "react";
import { redefinirSenhaAction } from "../actions";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RedefinirForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redefinirSenhaAction, idle);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={6} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</Button>
    </form>
  );
}
