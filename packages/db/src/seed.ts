import { db } from "./client.js";
import { usuarios } from "./schema/index.js";

/**
 * Usuario demo hasta que exista JWT real de CORE (ver apps/api EventosService).
 * Las locaciones ya no se siembran: `apps/api` las sincroniza desde el catálogo
 * de Backoffice (ver ADR 0013), así que alcanza con levantar la API.
 */
async function seed() {
  await db
    .insert(usuarios)
    .values({
      id: "seed-admin-demo",
      nombre: "Admin Demo",
      email: "admin.demo@uadenet.edu",
      rol: "administrativo",
    })
    .onConflictDoNothing();

  console.log("Seed OK");
}

seed()
  .catch((err: unknown) => {
    console.error("Seed falló:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
