import { requireUser } from "@/lib/auth/current-user";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
