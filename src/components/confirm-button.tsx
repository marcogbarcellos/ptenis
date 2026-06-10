"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function ConfirmButton({ titulo, descricao, acao, children, variant = "outline" }: {
  titulo: string; descricao: string;
  acao: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "outline" | "destructive" | "default" | "secondary";
}) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={pending}
        className={cn(buttonVariants({ variant }), "w-full")}
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={() => start(async () => {
            const r = await acao();
            if (!r.ok && r.error) toast.error(r.error);
          })}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
