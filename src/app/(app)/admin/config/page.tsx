import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/current-user";
import { ConfigForm } from "./form";

export default async function AdminConfigPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Configurações</h1>
      <ConfigForm communityName={settings.communityName}
        inviteCode={settings.inviteCode} timezone={settings.timezone} />
      <p className="text-xs text-muted-foreground">
        Trocar o código de convite invalida o anterior na hora — poste o novo no grupo.
      </p>
    </div>
  );
}
