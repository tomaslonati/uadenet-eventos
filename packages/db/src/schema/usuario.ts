import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rolUsuario = pgEnum("rol_usuario", [
  "estudiante",
  "docente",
  "administrativo",
]);

/**
 * Caché local de usuarios de CORE: se hace upsert por `id` con cada JWT
 * válido, no es una tabla de auth propia (ver docs/02-arquitectura/modelo-dominio.md).
 */
export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull(),
  rol: rolUsuario("rol").notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
