import type { User } from "@prisma/client";
import type { Standing } from "@/lib/classificacao";
import { cn } from "@/lib/utils";

export function TabelaClassificacao({ standings, usuarios, destaqueUserId, classificados = 4 }: {
  standings: Standing[];
  usuarios: Map<string, User>;
  destaqueUserId?: string;
  classificados?: number; // quantos vão pros playoffs (linha visual)
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Jogador</th>
            <th className="p-2 text-center" title="Pontos">P</th>
            <th className="p-2 text-center" title="Jogos">J</th>
            <th className="p-2 text-center" title="Vitórias">V</th>
            <th className="p-2 text-center" title="Saldo de sets">±S</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.userId}
              className={cn(
                "border-t",
                s.posicao === classificados && "border-b-2 border-b-primary/40",
                s.userId === destaqueUserId && "bg-accent/50 font-medium"
              )}>
              <td className="p-2">{s.posicao <= classificados ? <span className="font-bold text-primary">{s.posicao}</span> : s.posicao}</td>
              <td className="max-w-0 truncate p-2">{usuarios.get(s.userId)?.name ?? "?"}</td>
              <td className="p-2 text-center font-bold">{s.pontos}</td>
              <td className="p-2 text-center text-muted-foreground">{s.jogos}</td>
              <td className="p-2 text-center">{s.vitorias}</td>
              <td className="p-2 text-center">{s.saldoSets > 0 ? `+${s.saldoSets}` : s.saldoSets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
