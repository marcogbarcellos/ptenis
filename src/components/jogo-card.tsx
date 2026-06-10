import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Match, User } from "@prisma/client";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora, placarTexto } from "@/lib/format";

export type MatchComJogadores = Match & { playerA: User; playerB: User | null };

const TIPO_LABEL = { amistoso: "Amistoso", liga: "Liga", playoff: "Playoff" } as const;
const STATUS_LABEL: Record<string, string> = {
  aberto: "Procurando parceiro",
  proposto: "Proposta de data",
  marcado: "Marcado",
  aguardando_confirmacao: "Placar a confirmar",
  confirmado: "Finalizado",
  pendente: "Sem data",
  cancelado: "Cancelado",
  wo: "W.O.",
};

export function JogoCard({ match, tz, children }: {
  match: MatchComJogadores; tz: string; children?: React.ReactNode;
}) {
  const aberto = match.status === "aberto";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={match.type === "amistoso" ? "secondary" : "default"}>
          {TIPO_LABEL[match.type]}
        </Badge>
        <span className="text-xs text-muted-foreground">{STATUS_LABEL[match.status]}</span>
      </div>

      <Link href={`/jogo/${match.id}`} className="mt-3 block">
        <div className="flex items-center gap-3">
          <AvatarIniciais nome={match.playerA.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {match.playerA.name}
              {match.playerB && <span className="text-muted-foreground"> vs </span>}
              {match.playerB?.name}
            </p>
            {aberto && <NivelBadge nivel={match.playerA.level} />}
            {match.score != null && (
              <p className="text-sm font-medium text-primary">{placarTexto(match.score as number[][])}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {match.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" />
              {formatarDataHora(match.scheduledAt, tz)}
            </span>
          )}
          {match.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />{match.location}
            </span>
          )}
        </div>
        {match.note && <p className="mt-2 text-sm text-muted-foreground">&ldquo;{match.note}&rdquo;</p>}
      </Link>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
