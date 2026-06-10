"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ajustarNivelAction, alternarAdminAction, alternarAtivoAction } from "../actions";

export function UsuarioControles({ userId, nivel, isAdmin, isActive, souEu }: {
  userId: string; nivel: number; isAdmin: boolean; isActive: boolean; souEu: boolean;
}) {
  const [pending, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success("Feito.");
      else if (r.error) toast.error(r.error);
    });

  return (
    <div className="flex items-center gap-2">
      <select value={nivel} disabled={pending}
        className="rounded-lg border bg-background p-1 text-sm"
        onChange={(e) => rodar(() => ajustarNivelAction(userId, Number(e.target.value)))}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>N{n}</option>)}
      </select>
      {!souEu && (
        <Dialog>
          <DialogTrigger render={<Button size="icon" variant="ghost" />}>
            <MoreVertical className="size-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerenciar usuário</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled={pending}
                onClick={() => rodar(() => alternarAdminAction(userId))}>
                {isAdmin ? "Remover admin" : "Tornar admin"}
              </Button>
              <Button variant={isActive ? "destructive" : "default"} className="w-full" disabled={pending}
                onClick={() => rodar(() => alternarAtivoAction(userId))}>
                {isActive ? "Desativar (some das listas)" : "Reativar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
