import { Badge } from "@/components/ui/badge";
import { nivelLabel } from "@/lib/nivel";

export function NivelBadge({ nivel }: { nivel: number }) {
  return (
    <Badge variant="secondary" className="gap-1 font-medium">
      <span className="text-primary">N{nivel}</span>
      <span className="text-muted-foreground">{nivelLabel(nivel)}</span>
    </Badge>
  );
}
