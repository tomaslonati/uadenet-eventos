import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const locaciones = pgTable("locaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  sede: text("sede").notNull(),
  capacidad: integer("capacidad").notNull(),
  /** Sincronizado desde el catálogo de Backoffice Administrativo (ver ADR 0013). */
  aptoEventos: boolean("apto_eventos").notNull().default(true),
});
