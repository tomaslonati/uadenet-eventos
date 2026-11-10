import { z } from "zod";

export const categoriaPrecioSchema = z.enum(["general", "especial"]);

export type CategoriaPrecio = z.infer<typeof categoriaPrecioSchema>;

export const estadoEventoSchema = z.enum(["publicado", "cancelado"]);

export type EstadoEvento = z.infer<typeof estadoEventoSchema>;

export const crearEventoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    locacionId: z.uuid(),
    cupoMaximo: z.number().int().positive(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    esPago: z.boolean(),
    categoriaPrecio: categoriaPrecioSchema.nullable().optional(),
  })
  .refine((datos) => datos.fechaFin > datos.fechaInicio, {
    message: "fechaFin debe ser posterior a fechaInicio",
    path: ["fechaFin"],
  })
  .refine((datos) => !datos.esPago || datos.categoriaPrecio != null, {
    message: "categoriaPrecio es obligatoria cuando esPago es true",
    path: ["categoriaPrecio"],
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
  categoriaPrecio: categoriaPrecioSchema.nullable(),
  creadoPor: z.string(),
  estado: estadoEventoSchema,
  motivoCancelacion: z.string().nullable(),
  /** Si cambió la fecha o la locación: habilita cancelar la inscripción sin el límite de 24 hs. */
  reprogramadoEn: z.coerce.date().nullable(),
});

export type Evento = z.infer<typeof eventoSchema>;

/**
 * Edición parcial por el creador. Todos los campos son opcionales; los que no
 * viajan no se tocan. Las reglas que dependen del estado (cupo vs. inscriptos,
 * pago con inscriptos, evento ya iniciado) las valida el servicio.
 */
export const actualizarEventoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    locacionId: z.uuid(),
    cupoMaximo: z.number().int().positive(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    esPago: z.boolean(),
    categoriaPrecio: categoriaPrecioSchema.nullable(),
  })
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "No hay cambios para guardar",
  })
  .refine(
    (datos) =>
      datos.fechaInicio === undefined ||
      datos.fechaFin === undefined ||
      datos.fechaFin > datos.fechaInicio,
    {
      message: "fechaFin debe ser posterior a fechaInicio",
      path: ["fechaFin"],
    },
  );

export type ActualizarEvento = z.infer<typeof actualizarEventoSchema>;

export const MAX_LARGO_MOTIVO_CANCELACION = 500;

export const cancelarEventoSchema = z.object({
  motivo: z.string().trim().min(1).max(MAX_LARGO_MOTIVO_CANCELACION),
});

export type CancelarEvento = z.infer<typeof cancelarEventoSchema>;

/** Qué se mueve si el creador cancela: es lo que muestra la confirmación antes de hacerlo. */
export const impactoEventoSchema = z.object({
  eventoId: z.uuid(),
  inscriptos: z.number().int(),
  inscriptosPagos: z.number().int(),
  /** Suma de lo cobrado a las inscripciones pagas; es lo que se devolvería. */
  montoAReembolsar: z.number().int(),
  /** Reembolsos de una cancelación anterior que CORE todavía no confirmó. */
  reembolsosPendientes: z.number().int(),
  asistenciasRegistradas: z.number().int(),
});

export type ImpactoEvento = z.infer<typeof impactoEventoSchema>;

export const resultadoCancelacionEventoSchema = z.object({
  eventoId: z.uuid(),
  inscriptosAfectados: z.number().int(),
  reembolsados: z.number().int(),
  /** Pagos que no se pudieron devolver todavía; se reintentan repitiendo la cancelación. */
  reembolsosPendientes: z.number().int(),
  montoReembolsado: z.number().int(),
  notificados: z.number().int(),
});

export type ResultadoCancelacionEvento = z.infer<
  typeof resultadoCancelacionEventoSchema
>;

export const resultadoEdicionEventoSchema = z.object({
  evento: eventoSchema,
  /** Inscriptos a los que se les avisó el cambio de fecha o lugar. */
  notificados: z.number().int(),
});

export type ResultadoEdicionEvento = z.infer<
  typeof resultadoEdicionEventoSchema
>;

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
  /** Resuelto contra la tarifa vigente de Backoffice para categoriaPrecio (ver ADR 0013), no una columna. */
  precio: z.number().int().nullable(),
});

export type EventoDeCartelera = z.infer<typeof eventoDeCarteleraSchema>;
