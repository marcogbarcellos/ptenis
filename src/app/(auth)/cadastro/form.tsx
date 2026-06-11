"use client";
import { useActionState } from "react";
import { cadastroAction } from "../actions";
import { idle } from "@/lib/action-state";
import { QUESTIONARIO_NIVEL } from "@/lib/nivel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const dados = [
  { id: "nome", label: "Nome", type: "text", auto: "name", placeholder: "" },
  { id: "email", label: "E-mail", type: "email", auto: "email", placeholder: "" },
  { id: "telefone", label: "WhatsApp (com DDD)", type: "tel", auto: "tel", placeholder: "11 91234-5678" },
  { id: "senha", label: "Senha", type: "password", auto: "new-password", placeholder: "Mínimo 6 caracteres" },
] as const;

export function CadastroForm({ codigoConvite = "" }: { codigoConvite?: string }) {
  const [state, action, pending] = useActionState(cadastroAction, idle);
  return (
    <form action={action} className="space-y-3">
      {codigoConvite ? (
        <>
          <input type="hidden" name="codigo" value={codigoConvite} />
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            🎾 Convite válido — é só preencher seus dados.
          </p>
        </>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="codigo">Código de convite</Label>
          <Input id="codigo" name="codigo" type="text" autoComplete="off"
            placeholder="Pegue no grupo do WhatsApp" required />
        </div>
      )}
      {dados.map((c) => (
        <div key={c.id} className="space-y-1">
          <Label htmlFor={c.id}>{c.label}</Label>
          <Input id={c.id} name={c.id} type={c.type} autoComplete={c.auto} placeholder={c.placeholder} required
            minLength={c.id === "senha" ? 6 : undefined} />
        </div>
      ))}
      <Separator className="my-4" />
      <p className="text-sm font-medium">Seu nível de jogo (4 perguntas rápidas)</p>
      <p className="text-xs text-muted-foreground">É só um chute pra começar — o professor ajusta antes da liga.</p>
      {QUESTIONARIO_NIVEL.map((p, i) => (
        <div key={p.id} className="space-y-1">
          <Label htmlFor={`q${i + 1}`}>{p.pergunta}</Label>
          <select id={`q${i + 1}`} name={`q${i + 1}`} required defaultValue=""
            className="w-full rounded-lg border border-input bg-background p-2 text-sm">
            <option value="" disabled>Escolha…</option>
            {p.opcoes.map((o, j) => <option key={j} value={j + 1}>{o}</option>)}
          </select>
        </div>
      ))}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Criando…" : "Criar conta"}</Button>
    </form>
  );
}
