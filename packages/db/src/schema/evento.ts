import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locaciones } from "./locacion.js";
import { usuarios } from "./usuario.js";

/** `cancelado` es una baja lógica: el evento se conserva para el historial de inscriptos y reembolsos. */
export const estadoEvento = pgEnum("estado_evento", ["publicado", "cancelado"]);

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
  estado: estadoEvento("estado").notNull().default("publicado"),
  motivoCancelacion: text("motivo_cancelacion"),
  canceladoEn: timestamp("cancelado_en", { withTimezone: true }),
  /** Última vez que cambió la fecha o la locación; habilita la cancelación libre de las inscripciones (ver modelo-dominio). */
  reprogramadoEn: timestamp("reprogramado_en", { withTimezone: true }),
});
