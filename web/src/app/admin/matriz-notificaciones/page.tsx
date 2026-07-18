import { PageHeader } from "@/components/ui";
import { NotifMatrixClient } from "./NotifMatrixClient";

export const dynamic = "force-dynamic";

export default function MatrizNotificacionesPage() {
  return (
    <>
      <PageHeader
        title="Matriz de notificaciones"
        subtitle="Evento × audiencia × canales (email, telegram, in-app, push). Editable por tenant."
      />
      <NotifMatrixClient />
    </>
  );
}
