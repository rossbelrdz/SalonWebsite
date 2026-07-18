import { PageHeader } from "@/components/ui";
import { PermissionsMatrixClient } from "./PermissionsMatrixClient";

export const dynamic = "force-dynamic";

export default function AdminPermisosPage() {
  return (
    <>
      <PageHeader
        title="Matriz de permisos"
        subtitle="Define qué puede hacer cada rol (no hardcodeado). Se evalúa en servidor."
      />
      <PermissionsMatrixClient />
    </>
  );
}
