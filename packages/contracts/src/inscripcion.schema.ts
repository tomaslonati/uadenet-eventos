import { z } from "zod";

export const crearInscripcionSchema = z.object({
  eventoId: z.uuid(),
});

export type CrearInscripcion = z.infer<typeof crearInscripcionSchema>;

export const inscripcionSchema = z.object({
  id: z.uuid(),
  eventoId: z.uuid(),
  usuarioId: z.string(),
  fechaInscripcion: z.coerce.date(),
  estado: z.literal("inscripto"),
  pagoConfirmado: z.boolean(),
  /** Monto que Backoffice devolvió al confirmarse esta inscripción — no se recalcula si la tarifa cambia después (ver ADR 0013). */
  montoCobrado: z.number().int().nullable(),
});

export type Inscripcion = z.infer<typeof inscripcionSchema>;
