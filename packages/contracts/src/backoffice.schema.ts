import { z } from "zod";
import type { CategoriaPrecio } from "./evento.schema.js";

/**
 * Shapes de lo que devuelve Backoffice Administrativo. Los ids se validan con
 * `guid` (no `uuid`) porque son de otro módulo y no controlamos su versión.
 */

/** `GET /api/v1/backoffice/sedes` — el shape no está confirmado por Backoffice, se asume `id` + `nombre`. */
export const sedeBackofficeSchema = z.object({
  id: z.guid(),
  nombre: z.string(),
});

export type SedeBackoffice = z.infer<typeof sedeBackofficeSchema>;

/** `GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true` */
export const espacioBackofficeSchema = z.object({
  id: z.guid(),
  sedeId: z.guid(),
  codigo: z.string(),
  nombre: z.string(),
  tipo: z.string(),
  capacidad: z.number().int(),
  aptoEventos: z.boolean(),
  estado: z.string(),
});

export type EspacioBackoffice = z.infer<typeof espacioBackofficeSchema>;

export const conceptoTarifaSchema = z.enum([
  "EVENTO_INSCRIPCION_GENERAL",
  "EVENTO_INSCRIPCION_ESPECIAL",
]);

export type ConceptoTarifa = z.infer<typeof conceptoTarifaSchema>;

/** Cada `categoriaPrecio` del evento se resuelve contra un concepto de tarifa distinto. */
export const CONCEPTO_POR_CATEGORIA: Record<CategoriaPrecio, ConceptoTarifa> = {
  general: "EVENTO_INSCRIPCION_GENERAL",
  especial: "EVENTO_INSCRIPCION_ESPECIAL",
};

/** `GET /api/v1/backoffice/tarifas/vigente?concepto=&fecha=` */
export const tarifaVigenteSchema = z.object({
  concepto: conceptoTarifaSchema,
  sede: z.string().nullable(),
  ambitoResuelto: z.string(),
  monto: z.number(),
  moneda: z.string(),
  unidad: z.string(),
  vigencia: z.object({
    desde: z.string(),
    hasta: z.string().nullable(),
  }),
  tarifaId: z.guid(),
});

export type TarifaVigente = z.infer<typeof tarifaVigenteSchema>;

/** `GET /api/v1/backoffice/usuarios/{id}` */
export const usuarioBackofficeSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  rol: z.enum(["estudiante", "docente", "administrativo"]),
  sede: z.string().optional(),
});

export type UsuarioBackoffice = z.infer<typeof usuarioBackofficeSchema>;
