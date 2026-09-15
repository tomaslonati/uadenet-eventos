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
});

export type Inscripcion = z.infer<typeof inscripcionSchema>;
