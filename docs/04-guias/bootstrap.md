# Guía — inicialización del repo `uadenet-eventos`

> **Estado: ya ejecutada.** El monorepo está inicializado (ver la tarea técnica "Setup del monorepo" en [`../01-proyecto/backlog.md`](../01-proyecto/backlog.md)). Se conserva porque documenta el orden y el porqué de cada paso: sirve para reconstruir el repo desde cero, para entender por qué algo quedó como quedó, y para levantar un módulo hermano con el mismo esqueleto. Si un paso ya no refleja el estado real, corregirlo acá.

Este documento es para inicializar el monorepo desde cero, sin re-derivar decisiones que ya están tomadas. Antes de tocar código, leer `AGENTS.md` (convenciones) y todo `docs/` (contexto y arquitectura) — este archivo asume que ya se leyeron.

**Regla general: ejecutar en el orden dado, sin saltar pasos.** Cada bloque depende del anterior. Si algo falla o hay que decidir algo que no está en `docs/`, parar y preguntar — no asumir.

---

## 0. Prerrequisitos (verificar, no asumir)

- Node LTS activa instalada (ver `../02-arquitectura/stack-y-estructura.md` por la versión vigente).
- pnpm disponible (`corepack enable` si hace falta).
- Credenciales de la branch base de Neon (connection string; pedir al equipo si no las tenés — no se versionan).
- No se necesita Docker ni Postgres local (ver ADR 0006, ADR 0008).

## 1. Repo y monorepo

1. Inicializar git en la carpeta actual si no está inicializado. Branch por defecto: `main` (sin `dev`, ver ADR 0007).
2. Scaffoldear con Turborepo: `pnpm dlx create-turbo@latest` (elegir pnpm como package manager cuando lo pregunte).
3. Ajustar `pnpm-workspace.yaml` para que incluya `apps/*` y `packages/*`.
4. Definir en `turbo.json` las tasks: `build`, `lint`, `test`, `typecheck`, y `dev` (sin caché, modo `persistent`).
5. Mover/conservar `AGENTS.md`, `CLAUDE.md` y la carpeta `docs/` en la raíz del repo tal como están — son la fuente de verdad del proyecto, no recrearlos.
6. Commit: `chore: setup inicial del monorepo` directo a `main`.

## 2. Packages compartidos (antes que las apps)

Crear en este orden porque `apps/api` los importa desde el primer commit real:

1. `packages/typescript-config` — `tsconfig.base.json` con `"strict": true`.
2. `packages/eslint-config` — reglas compartidas. (Si se decide usar Biome en vez de ESLint/Prettier, actualizar este paso y `../02-arquitectura/stack-y-estructura.md` antes de seguir — no está cerrado, ver `../01-proyecto/backlog.md`.)
3. `packages/env` — un schema de Zod que valida las env vars requeridas (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) y falla explícito al boot si falta alguna.
4. `packages/contracts` — carpeta `src/` vacía por ahora salvo un `index.ts` placeholder; se llena a medida que se cierre `../02-arquitectura/modelo-dominio.md` (ver ADR 0005: Zod, no generado desde OpenAPI).
5. `packages/db`:
   - Instalar `drizzle-orm` + `@neondatabase/serverless` (driver serverless de Neon) + `drizzle-kit` como dev dependency.
   - `src/client.ts` — cliente Drizzle usando `drizzle-orm/neon-http` sobre `@neondatabase/serverless`, que lee la connection string desde `packages/env`.
   - `src/schema/` — vacío por ahora, esperar a que el modelo de dominio esté validado (`../02-arquitectura/modelo-dominio.md` todavía tiene TBDs).
   - `src/seed.ts` — placeholder, se completa cuando exista schema real.
   - **No correr ninguna migration contra la branch base de Neon todavía.** Cuando haya que tocar schema, crear antes una branch de Neon nueva a partir de la base (ver ADR 0008) y correr la migration ahí primero.

## 3. apps/api (NestJS)

1. `nest new api` dentro de `apps/` (o el flujo equivalente dentro de un monorepo pnpm, según lo que soporte la versión del Nest CLI al momento de correr esto).
2. Instalar y configurar `@nestjs/swagger` en `main.ts` — Swagger tiene que estar andando desde el primer commit de esta app, no agregarse después (ver `AGENTS.md`, sección Documentación).
3. Habilitar versionado de URI (`/api/v1/...`) en el bootstrap.
4. Crear la estructura de carpetas vacía con placeholders: `src/modules/`, `src/workers/`, `src/common/guards/`, `src/common/interceptors/`, `src/common/helpers/` (ver `../02-arquitectura/stack-y-estructura.md` para el árbol completo).
5. Módulo `health/` con un endpoint `GET /health` que devuelva `{ status: "ok" }` — tiene que ser lo primero que responda, antes de cualquier lógica de negocio.
6. Conectar `packages/db` y `packages/env` como dependencias del workspace (`workspace:*`).
7. **No crear todavía los módulos `eventos/`, `inscripciones/`, `asistencia/`** — dependen de que el modelo de dominio y el backlog estén cerrados (`../02-arquitectura/modelo-dominio.md`, `../01-proyecto/backlog.md`). Si en el momento de correr esto ya están cerrados, sí generarlos siguiendo la estructura feature-based documentada.

## 4. apps/web (Next.js)

1. `create-next-app` dentro de `apps/`, con TypeScript y App Router, dentro de la carpeta `apps/web`.
2. Conectar `packages/contracts` y `packages/env` como dependencias del workspace.
3. Una página placeholder en `/` que haga fetch a `/health` de `apps/api` (usando una env var para la URL base) y muestre el resultado — sirve para validar que la comunicación entre apps funciona antes de construir vistas reales.

## 5. CI/CD

1. `.github/workflows/ci.yml`: en cada PR contra `main`, correr `turbo run lint typecheck test build`.
2. No configurar Vercel automáticamente desde acá — eso requiere acceso a la cuenta del equipo. Dejar documentado en el README que faltan crear dos proyectos Vercel (`apps/web` y `apps/api` como Root Directory distintos) y avisar al equipo.

## 6. Cierre

1. Completar `README.md` de la raíz con: qué es el proyecto, cómo instalar (`pnpm install`), cómo correr en dev (`turbo run dev`), cómo correr las migrations cuando existan, link a `../01-proyecto/overview.md` para contexto completo.
2. Confirmar que `turbo run lint typecheck test build` corre sin errores de punta a punta antes de dar el bootstrap por terminado.
3. Actualizar `../01-proyecto/backlog.md`: marcar la tarea técnica "Setup del monorepo" como hecha, y volcar cualquier decisión tomada durante el bootstrap que no estuviera ya en `../decisions/` (agregar el ADR correspondiente si hizo falta decidir algo nuevo en el camino).

---

## Qué NO hacer en este bootstrap

- No modelar el schema de Drizzle todavía (depende de cerrar `../02-arquitectura/modelo-dominio.md`).
- No implementar el guard de validación de JWT de CORE con una lógica inventada — dejarlo como placeholder documentado (ver `../02-arquitectura/integraciones.md`, sigue pendiente).
- No agregar librerías, features o abstracciones no mencionadas acá o en `docs/` sin preguntar antes.
