import { z } from "zod";

export const crearEventoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    locacionId: z.uuid(),
    cupoMaximo: z.number().int().positive(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    esPago: z.boolean(),
    precio: z.number().int().positive().nullable().optional(),
  })
  .refine((datos) => datos.fechaFin > datos.fechaInicio, {
    message: "fechaFin debe ser posterior a fechaInicio",
    path: ["fechaFin"],
  })
  .refine((datos) => !datos.esPago || datos.precio != null, {
    message: "precio es obligatorio cuando esPago es true",
    path: ["precio"],
  });

export type CrearEvento = z.infer<typeof crearEventoSchema>;

export const eventoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  descripcion: z.string(),
  locacionId: z.uuid(),
  cupoMaximo: z.number().int(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  esPago: z.boolean(),
  precio: z.number().int().nullable(),
  creadoPor: z.string(),
});

export type Evento = z.infer<typeof eventoSchema>;

/**
 * Rango para el calendario de los portales: devuelve los eventos que se
 * solapan con la ventana, no solo los que empiezan dentro de ella.
 */
export const filtroEventosSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export type FiltroEventos = z.infer<typeof filtroEventosSchema>;

/**
 * Lo que consumen los portales: el evento con la locación ya resuelta y el
 * cupo calculado, para no obligarlos a una llamada por evento.
 */
export const eventoDeCarteleraSchema = eventoSchema.extend({
  locacion: z.object({ nombre: z.string(), sede: z.string() }),
  inscriptos: z.number().int(),
  disponibles: z.number().int(),
  yaInscripto: z.boolean(),
});

export type EventoDeCartelera = z.infer<typeof eventoDeCarteleraSchema>;
