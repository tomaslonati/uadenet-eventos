import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locaciones } from "./locacion.js";
import { usuarios } from "./usuario.js";

/** Definida por Backoffice Administrativo, no por este módulo (ver ADR 0013). */
export const categoriaPrecio = pgEnum("categoria_precio", ["general", "especial"]);

export const eventos = pgTable("eventos", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  locacionId: uuid("locacion_id")
    .notNull()
    .references(() => locaciones.id),
  cupoMaximo: integer("cupo_maximo").notNull(),
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true }).notNull(),
  fechaFin: timestamp("fecha_fin", { withTimezone: true }).notNull(),
  esPago: boolean("es_pago").notNull(),
  categoriaPrecio: categoriaPrecio("categoria_precio"),
  creadoPor: text("creado_por")
    .notNull()
    .references(() => usuarios.id),
});
