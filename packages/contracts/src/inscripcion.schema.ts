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
  /** `cancelada`: la dio de baja el creador al cancelar el evento (si la baja la pide la persona, la inscripción se borra). */
  estado: z.enum(["inscripto", "cancelada"]),
  pagoConfirmado: z.boolean(),
  /** Monto que Backoffice devolvió al confirmarse esta inscripción — no se recalcula si la tarifa cambia después (ver ADR 0013). */
  montoCobrado: z.number().int().nullable(),
  /** Cuándo CORE confirmó la devolución; `null` en una inscripción paga cancelada es reembolso pendiente. */
  reembolsadoEn: z.coerce.date().nullable(),
});

export type Inscripcion = z.infer<typeof inscripcionSchema>;

/** Hasta cuántas horas antes del inicio del evento se puede cancelar una inscripción (y recuperar el saldo si fue paga). */
export const HORAS_ANTICIPACION_CANCELACION = 24;

export const cancelacionInscripcionSchema = z.object({
  inscripcionId: z.uuid(),
  /** Monto devuelto a la cuenta institucional; `null` si la inscripción era gratuita. */
  montoReembolsado: z.number().int().nullable(),
});

export type CancelacionInscripcion = z.infer<
  typeof cancelacionInscripcionSchema
>;
