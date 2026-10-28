import { z } from "zod";

for (const ruta of [".env", "../../.env"]) {
  try {
    process.loadEnvFile?.(ruta);
  } catch {
    // Ignorar si el archivo no existe en esa ruta
  }
}

const limpiarVacio = (valor: unknown): unknown => {
  if (typeof valor === "string") {
    const limpio = valor.trim();
    return limpio === "" ? undefined : limpio;
  }
  return valor;
};

const urlOpcional = z.preprocess(
  limpiarVacio,
  z
    .url()
    .transform((u) => u.replace(/\/+$/, ""))
    .optional(),
);

const urlConDefault = (defecto: string) =>
  z.preprocess(
    limpiarVacio,
    z
      .url()
      .default(defecto)
      .transform((u) => u.replace(/\/+$/, "")),
  );

const textoOpcional = z.preprocess(limpiarVacio, z.string().optional());
const textoConDefault = (defecto: string) =>
  z.preprocess(limpiarVacio, z.string().default(defecto));

const envSchema = z.object({
  DATABASE_URL: z.preprocess(
    limpiarVacio,
    z.url().default("postgres://postgres:postgres@localhost:5432/postgres"),
  ),
  NODE_ENV: z.preprocess(
    limpiarVacio,
    z.enum(["development", "test", "production"]).default("development"),
  ),
  /**
   * Base de la API de Backoffice Administrativo. Sin definir, `apps/api` sirve
   * un Backoffice simulado en sus propias rutas `/api/v1/backoffice/**`.
   */
  BACKOFFICE_BASE_URL: urlOpcional,
  /** Base de la API de CORE en desarrollo o producción. */
  CORE_BASE_URL: urlOpcional,
  /** Identificador del servicio para comunicación inter-módulos. */
  CORE_CLIENT_ID: textoConDefault("events-service"),
  /** Secreto de servicio para solicitar tokens a CORE. */
  CORE_CLIENT_SECRET: textoConDefault("events-service-secret"),
  /** Secreto compartido con el API Gateway de CORE para validar X-Core-Signature. */
  CORE_GATEWAY_SECRET: textoOpcional,
  /** URL pública del frontend para links en notificaciones (HU7). */
  FRONTEND_BASE_URL: urlConDefault("https://uadenet-eventos.vercel.app"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
