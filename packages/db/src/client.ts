import { env } from "@repo/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const sql = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle({ client: sql });
