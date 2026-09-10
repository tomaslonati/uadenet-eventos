import { z } from "zod";

export const cupoSchema = z.object({
  eventoId: z.uuid(),
  cupoMaximo: z.number().int(),
  inscriptos: z.number().int(),
  disponibles: z.number().int(),
});

export type Cupo = z.infer<typeof cupoSchema>;
