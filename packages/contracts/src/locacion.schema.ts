import { z } from "zod";

export const locacionSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  sede: z.string(),
  capacidad: z.number().int(),
  aptoEventos: z.boolean(),
});

export type Locacion = z.infer<typeof locacionSchema>;
