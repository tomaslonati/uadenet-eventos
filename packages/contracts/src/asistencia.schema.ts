import { z } from "zod";

export const metodoAsistenciaSchema = z.enum([
  "qr",
  "codigo-en-sala",
  "manual",
]);

export type MetodoAsistencia = z.infer<typeof metodoAsistenciaSchema>;

export const registrarAsistenciaSchema = z.object({
  inscripcionId: z.uuid(),
  metodo: metodoAsistenciaSchema,
});

export type RegistrarAsistencia = z.infer<typeof registrarAsistenciaSchema>;

export const asistenciaSchema = z.object({
  id: z.uuid(),
  inscripcionId: z.uuid(),
  confirmadaEn: z.coerce.date(),
  metodo: metodoAsistenciaSchema,
});

export type Asistencia = z.infer<typeof asistenciaSchema>;

export const asistenteEventoSchema = z.object({
  inscripcionId: z.uuid(),
  eventoId: z.uuid(),
  usuario: z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string(),
    rol: z.enum(["estudiante", "docente", "administrativo"]),
  }),
  acreditado: z.boolean(),
  asistencia: asistenciaSchema.nullable(),
});

export type AsistenteEvento = z.infer<typeof asistenteEventoSchema>;
