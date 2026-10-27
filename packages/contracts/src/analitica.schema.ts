import { z } from "zod";
import { categoriaPrecioSchema } from "./evento.schema.js";

/**
 * Eventos que este módulo emite hacia Analítica Institucional (ver
 * docs/02-arquitectura/flujo-de-datos-integraciones.md). Las fechas viajan
 * como string ISO 8601: el payload se serializa tal cual hacia el canal.
 */
const fecha = z.iso.datetime({ offset: true });

const rolSchema = z.enum(["estudiante", "docente", "administrativo"]);

export const eventoCreadoSchema = z.object({
  tipo: z.literal("evento.creado"),
  eventoId: z.uuid(),
  titulo: z.string(),
  locacionId: z.uuid(),
  sede: z.string(),
  cupoMaximo: z.number().int(),
  fechaInicio: fecha,
  fechaFin: fecha,
  esPago: z.boolean(),
  categoriaPrecio: categoriaPrecioSchema.nullable(),
  emitidoEn: fecha,
});

export const inscripcionRegistradaSchema = z.object({
  tipo: z.literal("inscripcion.registrada"),
  inscripcionId: z.uuid(),
  eventoId: z.uuid(),
  usuarioId: z.string(),
  rol: rolSchema,
  pagoConfirmado: z.boolean(),
  emitidoEn: fecha,
});

export const asistenciaConfirmadaSchema = z.object({
  tipo: z.literal("asistencia.confirmada"),
  inscripcionId: z.uuid(),
  eventoId: z.uuid(),
  usuarioId: z.string(),
  confirmadaEn: fecha,
  emitidoEn: fecha,
});

export const eventoAnaliticaSchema = z.discriminatedUnion("tipo", [
  eventoCreadoSchema,
  inscripcionRegistradaSchema,
  asistenciaConfirmadaSchema,
]);

export type EventoCreado = z.infer<typeof eventoCreadoSchema>;
export type InscripcionRegistrada = z.infer<typeof inscripcionRegistradaSchema>;
export type AsistenciaConfirmada = z.infer<typeof asistenciaConfirmadaSchema>;
export type EventoAnalitica = z.infer<typeof eventoAnaliticaSchema>;
