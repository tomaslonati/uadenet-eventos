import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
