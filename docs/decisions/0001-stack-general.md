# ADR 0001 — Stack general

> **Nota (ADR 0008):** el proveedor de DB pasó de Supabase a Neon. El resto de esta decisión sigue vigente. Ver `docs/01-arquitectura.md` para el stack actualizado.

**Contexto:** Hay que elegir tecnologías para el módulo Eventos Académicos, justificables y defendibles en las entregas del TP.

**Opciones consideradas:** libertad total según el enunciado del TP; se evaluó mantener consistencia con tecnologías modernas, no deprecadas, y con buena integración entre sí.

**Decisión:** Next.js (frontend) + NestJS (backend) + Drizzle (ORM) + Supabase/Postgres (DB) + TypeScript en ambas apps + Vercel (hosting) + monorepo con Turborepo/pnpm.

**Motivo:** Next.js y Vercel tienen integración nativa (mismo equipo, cero fricción de deploy). Supabase da Postgres + Auth + Realtime gestionado sin operar infraestructura propia. TypeScript de punta a punta permite compartir tipos entre frontend y backend. Monorepo porque frontend y backend de este módulo están fuertemente acoplados y se versionan juntos.
