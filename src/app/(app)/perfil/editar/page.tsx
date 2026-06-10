import { requireUser } from "@/lib/auth/current-user";
import { Separator } from "@/components/ui/separator";
import { PerfilForm, SenhaForm } from "./forms";

export default async function EditarPerfilPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Editar perfil</h1>
      <PerfilForm nome={user.name} telefone={user.phone}
        disponibilidade={Array.isArray(user.availability) ? (user.availability as string[]) : []} />
      <Separator />
      <SenhaForm />
    </div>
  );
}
