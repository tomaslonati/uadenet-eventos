# ADR 0006 — Supabase compartido para desarrollo

> **Superseded parcialmente por ADR 0008** (migración a Neon): se mantiene la idea de "un entorno de dev compartido, sin Docker local", pero cambia el mecanismo — en vez de un único proyecto compartido, se usa una branch de Neon por PR. Se deja este ADR intacto como registro histórico de por qué se descartó Docker local.

**Contexto:** El equipo necesita una base de datos contra la cual desarrollar localmente.

**Opciones consideradas:**
1. Supabase CLI local (Docker) — cada dev con su propia base, aislada.
2. Un único proyecto Supabase en la nube, compartido por todo el equipo.

**Decisión:** Opción 2 — proyecto Supabase compartido de dev.

**Motivo:** Arranca en minutos sin depender de que todos tengan Docker funcionando, prioridad para un equipo de facultad con setups heterogéneos. Costo aceptado: si dos personas migran el schema al mismo tiempo se pueden pisar — mitigado con la regla de avisar en el grupo antes de correr una migration (ver `AGENTS.md`) y con `packages/db/src/seed.ts` para poder resetear a un estado conocido.
