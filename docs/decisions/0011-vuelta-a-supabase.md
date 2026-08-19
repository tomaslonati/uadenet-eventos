# ADR 0011 — Vuelta a Supabase como proveedor de Postgres

**Contexto:** ADR 0008 había migrado de Supabase a Neon por falta de cupo gratis en Supabase y para aprovechar el branching nativo de Neon. Tras una charla de equipo, se decidió volver a Supabase por preferencia del equipo/cátedra — no hay un problema técnico puntual con Neon de por medio.

**Opciones consideradas:**
1. Quedarse en Neon (statu quo de ADR 0008).
2. Volver a Supabase.

**Decisión:** Volver a Supabase.

**Motivo:** Preferencia de equipo. Igual que documentó ADR 0008 en el sentido inverso, no hay dependencia real de features exclusivas de ningún proveedor (el auth lo maneja CORE, no se usa Realtime), así que el cambio no tiene costo de arquitectura más allá del driver de conexión.

**Impacto en decisiones previas:**
- Revierte el driver de conexión en `packages/db`: vuelve a `postgres` (postgres.js) con `drizzle-orm/postgres-js`, en vez de `@neondatabase/serverless` + `drizzle-orm/neon-http`. Se conecta vía el pooler de transacciones de Supabase (Supavisor) con `prepare: false`, recomendado para entornos serverless (Vercel) para evitar problemas de prepared statements contra el pooler.
- Restaura la estrategia de entorno de dev de ADR 0006: un único proyecto Supabase compartido para todo el equipo (el free tier de Supabase no tiene branching nativo), avisando en el grupo antes de correr una migration y usando `packages/db/src/seed.ts` para resetear a un estado conocido si hace falta. Supersede la parte de "branch de Neon por PR" de ADR 0008.
- Solo se usa la connection string de Postgres (`DATABASE_URL`) a través de Drizzle — no se agrega `SUPABASE_URL` ni `SUPABASE_ANON_KEY` a `packages/env` porque no se usa el SDK `supabase-js` (el auth lo maneja CORE, no Supabase Auth).
- `../02-arquitectura/stack-y-estructura.md`, `README.md`, `AGENTS.md` y `../04-guias/bootstrap.md` quedan desactualizados en la mención de Neon — corregidos en el mismo cambio que este ADR.
