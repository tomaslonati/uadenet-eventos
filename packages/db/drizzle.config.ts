import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga el .env de la raíz del monorepo.
try {
  process.loadEnvFile("../../.env");
} catch {
  // Sin .env: se usa DATABASE_URL del entorno
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
