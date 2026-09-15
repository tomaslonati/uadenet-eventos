import { db } from "./client.js";
import { locaciones, usuarios } from "./schema/index.js";

/**
 * Usuario demo hasta que exista JWT real de CORE (ver apps/api EventosService).
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

  const existentes = await db
    .select({ id: locaciones.id })
    .from(locaciones)
    .limit(1);

  if (existentes.length === 0) {
    await db.insert(locaciones).values([
      { nombre: "Auditorio Magno", sede: "Sede Centro", capacidad: 300 },
      { nombre: "Aula Magna B", sede: "Sede Centro", capacidad: 80 },
      { nombre: "Salón de Actos", sede: "Sede Norte", capacidad: 150 },
      { nombre: "Aula 302", sede: "Sede Norte", capacidad: 40 },
    ]);
  }

  console.log("Seed OK");
}

seed()
  .catch((err: unknown) => {
    console.error("Seed falló:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
