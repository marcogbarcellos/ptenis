"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { adminDefinirPlacarAction, adminWOAction } from "../../actions";

export function JogoControles({ matchId, nomeA, nomeB, idA, idB }: {
  matchId: string; nomeA: string; nomeB: string; idA: string; idB: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [sets, setSets] = useState<string[][]>([["", ""], ["", ""], ["", ""]]);
  const [pending, start] = useTransition();

  const rodar = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(msg); setAberto(false); }
      else if (r.error) toast.error(r.error);
    });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Resolver
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{nomeA} × {nomeB}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {sets.map((linha, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">{i === 2 ? "Match TB" : `Set ${i + 1}`}</span>
              {[0, 1].map((lado) => (
                <Input key={lado} type="number" className="w-16 text-center" value={linha[lado]}
                  onChange={(e) => setSets((prev) =>
                    prev.map((l, j) => (j === i ? l.map((v, k) => (k === lado ? e.target.value : v)) : l))
                  )} />
              ))}
            </div>
          ))}
          <Button className="w-full" disabled={pending}
            onClick={() => rodar(() => adminDefinirPlacarAction(
              matchId,
              sets.filter(([a, b]) => a !== "" && b !== "").map(([a, b]) => [Number(a), Number(b)])
            ), "Placar definido.")}>
            Definir placar (já confirmado)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={pending}
              onClick={() => rodar(() => adminWOAction(matchId, idA), "W.O. aplicado.")}>
              W.O. p/ {nomeA.split(" ")[0]}
            </Button>
            <Button variant="outline" disabled={pending}
              onClick={() => rodar(() => adminWOAction(matchId, idB), "W.O. aplicado.")}>
              W.O. p/ {nomeB.split(" ")[0]}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
