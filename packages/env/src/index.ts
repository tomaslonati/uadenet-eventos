import { z } from "zod";

for (const ruta of [".env", "../../.env"]) {
  try {
    process.loadEnvFile?.(ruta);
  } catch {
    // Ignorar si el archivo no existe en esa ruta
  }
}

const envSchema = z.object({
  DATABASE_URL: z.url().default("postgres://postgres:postgres@localhost:5432/postgres"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Base de la API de Backoffice Administrativo. Sin definir, `apps/api` sirve
   * un Backoffice simulado en sus propias rutas `/api/v1/backoffice/**`.
   */
  BACKOFFICE_BASE_URL: z.url().optional(),
  /** Base de la API de CORE en desarrollo o producción. */
  CORE_BASE_URL: z.url().optional(),
  /** Identificador del servicio para comunicación inter-módulos. */
  CORE_CLIENT_ID: z.string().optional(),
  /** Secreto de servicio para solicitar tokens a CORE. */
  CORE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
