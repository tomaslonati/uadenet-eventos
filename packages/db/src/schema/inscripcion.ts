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
 * Un solo valor: la cancelación de inscripción no está en el alcance del TP
 * (ver docs/01-proyecto/backlog.md). Si se agrega, va con su propia migration.
 */
export const estadoInscripcion = pgEnum("estado_inscripcion", ["inscripto"]);

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
  },
  (tabla) => [unique().on(tabla.eventoId, tabla.usuarioId)],
);
