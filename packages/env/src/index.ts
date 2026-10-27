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
  CORE_CLIENT_ID: z.string().default("events-service"),
  /** Secreto de servicio para solicitar tokens a CORE. */
  CORE_CLIENT_SECRET: z.string().default("events-service-secret"),
  /** Secreto compartido con el API Gateway de CORE para validar X-Core-Signature. */
  CORE_GATEWAY_SECRET: z.string().optional(),
  /** URL pública del frontend para links en notificaciones (HU7). */
  FRONTEND_BASE_URL: z.url().default("https://uadenet-eventos.vercel.app"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
