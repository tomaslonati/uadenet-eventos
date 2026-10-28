import { env } from "@repo/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const esServerless = process.env.VERCEL === "1";

const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  ...(esServerless ? { max: 2, idle_timeout: 20, connect_timeout: 10 } : {}),
});

export const db = drizzle({ client: sql });
