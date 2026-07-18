import { readSession } from "@/lib/session";
import { PublicNavClient } from "@/components/PublicNavClient";

export async function PublicNav({ brand }: { brand?: string } = {}) {
  const session = await readSession();
  return (
    <PublicNavClient
      brand={brand || "Salon"}
      session={
        session
          ? {
              name: session.name,
              role: session.role,
              isSuperAdmin: session.isSuperAdmin,
            }
          : null
      }
    />
  );
}
