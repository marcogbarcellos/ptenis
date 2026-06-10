export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <div className="text-4xl">🎾</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">PTenis</h1>
        <p className="text-sm text-muted-foreground">Jogos da nossa comunidade</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
