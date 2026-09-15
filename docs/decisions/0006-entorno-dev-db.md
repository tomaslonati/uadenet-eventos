# ADR 0006 — Supabase compartido para desarrollo

> **Superseded parcialmente por ADR 0008** (migración a Neon), y esa parte restaurada por **ADR 0011** (vuelta a Supabase): la estrategia de "un proyecto compartido, sin Docker local" definida acá vuelve a estar vigente. Se deja este ADR intacto como registro histórico de por qué se descartó Docker local.

**Contexto:** El equipo necesita una base de datos contra la cual desarrollar localmente.

**Opciones consideradas:**
1. Supabase CLI local (Docker) — cada dev con su propia base, aislada.
2. Un único proyecto Supabase en la nube, compartido por todo el equipo.

**Decisión:** Opción 2 — proyecto Supabase compartido de dev.

**Motivo:** Arranca en minutos sin depender de que todos tengan Docker funcionando, prioridad para un equipo de facultad con setups heterogéneos. Costo aceptado: si dos personas migran el schema al mismo tiempo se pueden pisar — mitigado con la regla de avisar en el grupo antes de correr una migration (ver `AGENTS.md`) y con `packages/db/src/seed.ts` para poder resetear a un estado conocido.
