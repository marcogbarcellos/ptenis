"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-4xl">😵‍💫</div>
      <h1 className="text-lg font-bold">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">Tente de novo — se persistir, fale com o admin.</p>
      <button onClick={reset} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Tentar de novo
      </button>
    </main>
  );
}
