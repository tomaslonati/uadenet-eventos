import { env } from "@repo/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const esServerless = process.env.VERCEL === "1";

/**
 * En Vercel la función se congela entre pedidos y una conexión que quedó abierta
 * vuelve muerta: la query siguiente se cuelga sin error. La API mantiene viva la
 * función este tiempo después de cada respuesta para que el pool cierre las ociosas.
 */
export const IDLE_TIMEOUT_SERVERLESS_S = 5;

const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  ...(esServerless
    ? { max: 2, idle_timeout: IDLE_TIMEOUT_SERVERLESS_S, connect_timeout: 10 }
    : {}),
});

export const db = drizzle({ client: sql });
