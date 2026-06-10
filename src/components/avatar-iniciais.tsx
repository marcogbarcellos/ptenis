import { cn } from "@/lib/utils";
import { corAvatar, iniciais } from "@/lib/format";

export function AvatarIniciais({ nome, className }: { nome: string; className?: string }) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", corAvatar(nome), className)}>
      {iniciais(nome)}
    </div>
  );
}
