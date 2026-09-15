import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locaciones } from "./locacion.js";
import { usuarios } from "./usuario.js";

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
  precio: integer("precio"),
  creadoPor: text("creado_por")
    .notNull()
    .references(() => usuarios.id),
});
