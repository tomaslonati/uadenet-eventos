import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { eventos } from "./evento.js";
import { usuarios } from "./usuario.js";

/**
 * `cancelada` solo la deja la cancelación del evento por su creador: la fila se
 * conserva para poder seguir el reembolso. Cuando es la propia persona la que
 * cancela, la inscripción se borra (ver docs/02-arquitectura/modelo-dominio.md).
 */
export const estadoInscripcion = pgEnum("estado_inscripcion", [
  "inscripto",
  "cancelada",
]);

export const inscripciones = pgTable(
  "inscripciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventos.id),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    fechaInscripcion: timestamp("fecha_inscripcion", { withTimezone: true })
      .notNull()
      .defaultNow(),
    estado: estadoInscripcion("estado").notNull().default("inscripto"),
    pagoConfirmado: boolean("pago_confirmado").notNull(),
    /** Monto que devolvió Backoffice al confirmarse; se congela acá, no se recalcula (ver ADR 0013). */
    montoCobrado: integer("monto_cobrado"),
    /** Se completa cuando CORE confirma la reversa; en una inscripción paga cancelada, `null` significa reembolso pendiente. */
    reembolsadoEn: timestamp("reembolsado_en", { withTimezone: true }),
  },
  (tabla) => [unique().on(tabla.eventoId, tabla.usuarioId)],
);
