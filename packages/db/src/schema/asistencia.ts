import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { inscripciones } from "./inscripcion.js";

export const metodoAsistencia = pgEnum("metodo_asistencia", [
  "qr",
  "codigo-en-sala",
  "manual",
]);

export const asistencias = pgTable("asistencias", {
  id: uuid("id").primaryKey().defaultRandom(),
  inscripcionId: uuid("inscripcion_id")
    .notNull()
    .unique()
    .references(() => inscripciones.id),
  confirmadaEn: timestamp("confirmada_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metodo: metodoAsistencia("metodo").notNull(),
});
