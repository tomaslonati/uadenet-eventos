# ADR 0008 — Migración de Supabase a Neon como proveedor de Postgres

**Contexto:** El equipo se quedó sin proyectos gratis disponibles en Supabase. Hay que decidir si upgradear a un plan pago o cambiar de proveedor. Al revisar qué tanto dependíamos realmente de Supabase, se encontró que: el auth del módulo lo maneja CORE (JWT propio, no Supabase Auth) y el uso de Supabase Realtime para notificaciones nunca se cerró (seguía "a evaluar" en `04-integraciones.md`). En la práctica solo se estaba usando Postgres alojado.

**Opciones consideradas:**
1. Upgradear a un plan pago de Supabase.
2. Migrar a Neon (Postgres serverless).

**Decisión:** Migrar a Neon.

**Motivo:** Como no había dependencia real de las features exclusivas de Supabase (Auth, Realtime), el cambio de proveedor no tiene costo de arquitectura — Drizzle es agnóstico al host de Postgres. Neon tiene un free tier vigente y, a diferencia de Supabase, ofrece **branching de base de datos nativo** (cada branch de datos se crea por copy-on-write, sin duplicar el dataset completo).

**Impacto en decisiones previas:**
- Actualiza el driver de conexión en `packages/db`: se usa `@neondatabase/serverless` con `drizzle-orm/neon-http` en vez de un driver TCP genérico (`postgres.js`) — más apto para funciones serverless en Vercel, evita agotar el pool de conexiones en cold starts.
- **Supersede parcialmente al ADR 0006** ("Supabase compartido para desarrollo"): en vez de un único proyecto compartido donde todo el equipo puede pisarse el schema, se adopta **una branch de Neon por Pull Request / por feature**, creada desde la branch base de dev y descartada al mergear. Esto resuelve el riesgo que el ADR 0006 dejaba abierto (migraciones simultáneas pisándose) sin necesitar Docker local.
- El ADR 0001 (stack general) queda desactualizado en la mención de Supabase — ver `docs/01-arquitectura.md` para el stack vigente.

**Flujo de trabajo con branches de Neon:**
1. Existe una branch de Neon "base" (equivalente a los datos de dev/staging).
2. Al abrir un PR que toca `packages/db` (schema o dato), se crea una branch de Neon nueva a partir de la base, se corren las migrations ahí, y se prueba de forma aislada.
3. Al mergear el PR, se aplica la migration correspondiente sobre la branch base de Neon y se borra la branch temporal.
