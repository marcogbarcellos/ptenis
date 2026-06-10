export function EmptyState({ emoji, titulo, descricao, children }: {
  emoji: string; titulo: string; descricao?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="font-semibold">{titulo}</p>
      {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      {children}
    </div>
  );
}
