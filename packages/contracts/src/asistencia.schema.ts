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
