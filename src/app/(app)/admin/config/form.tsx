"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarConfigAction } from "../actions";

const FUSOS = ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "Europe/Lisbon"];

export function ConfigForm({ communityName, inviteCode, timezone }: {
  communityName: string; inviteCode: string; timezone: string;
}) {
  const [state, action, pending] = useActionState(salvarConfigAction, idle);
  useEffect(() => { if (state.ok) toast.success("Configurações salvas."); }, [state]);
  return (
    <form action={action} className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="communityName">Nome da comunidade</Label>
        <Input id="communityName" name="communityName" defaultValue={communityName} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inviteCode">Código de convite</Label>
        <Input id="inviteCode" name="inviteCode" defaultValue={inviteCode} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="timezone">Fuso horário</Label>
        <select id="timezone" name="timezone" defaultValue={timezone}
          className="w-full rounded-lg border bg-background p-2 text-sm">
          {FUSOS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>Salvar</Button>
    </form>
  );
}
