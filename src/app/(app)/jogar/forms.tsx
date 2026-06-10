"use client";
// id/htmlFor collision analysis: @base-ui/react Tabs.Panel has keepMounted=false by default,
// so inactive tab panels are unmounted from the DOM. ConviteForm and CombinadoForm are never
// simultaneously present in the DOM — no duplicate-id a11y issue exists at runtime.
import { useActionState } from "react";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { criarCombinadoAction, criarConviteAction } from "./actions";

function CamposComuns() {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="quando">Quando</Label>
        <Input id="quando" name="quando" type="datetime-local" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="local">Onde (opcional)</Label>
        <Input id="local" name="local" placeholder="Ex.: Quadra 1 da academia" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="formato">Formato</Label>
        <select
          id="formato"
          name="formato"
          defaultValue="bo3_mtb"
          className="w-full rounded-lg border border-input bg-background p-2 text-sm"
        >
          <option value="bo3_mtb">Melhor de 3 (match tiebreak no 3º)</option>
          <option value="set_unico">Set único</option>
          <option value="proset8">Pro-set de 8 games</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea
          id="observacao"
          name="observacao"
          placeholder="Ex.: só bater bola, levo as bolas"
        />
      </div>
    </>
  );
}

export function ConviteForm() {
  const [state, action, pending] = useActionState(criarConviteAction, idle);
  return (
    <form action={action} className="space-y-3">
      <CamposComuns />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Publicando…" : "Publicar no mural"}
      </Button>
    </form>
  );
}

export function CombinadoForm({
  jogadores,
}: {
  jogadores: { id: string; name: string; level: number }[];
}) {
  const [state, action, pending] = useActionState(criarCombinadoAction, idle);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="parceiroId">Parceiro</Label>
        <select
          id="parceiroId"
          name="parceiroId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-input bg-background p-2 text-sm"
        >
          <option value="" disabled>
            Escolha…
          </option>
          {jogadores.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} (N{j.level})
            </option>
          ))}
        </select>
      </div>
      <CamposComuns />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar jogo"}
      </Button>
    </form>
  );
}
