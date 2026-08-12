# Plan de setup — uadenet-eventos

Orden pensado para no bloquearse entre pasos. Cada bloque asume que el anterior ya cerró.

## 0. Prerrequisitos (una vez por integrante)

- Node 24 (LTS activa) — usar `nvm` o similar para no pisar otras versiones que ya tengan instaladas.
- pnpm (`corepack enable` alcanza, ya viene con Node).
- Cuenta en el proyecto Supabase compartido de dev (te la crea quien lo haya armado).
- Acceso al repo de GitHub y al proyecto de Vercel.
- No hace falta Docker ni Supabase CLI local — decidimos trabajar contra el Supabase de dev compartido.

## 1. Scaffold del monorepo

1. Crear el repo en GitHub (privado), branch por defecto `main`, con protección (no push directo, requiere PR). No se usa branch `dev` — todo PR va directo contra `main`.
2. Inicializar con Turborepo: `pnpm dlx create-turbo@latest`.
3. Configurar `pnpm-workspace.yaml` apuntando a `apps/*` y `packages/*`.
4. Definir `turbo.json` con las tasks base: `build`, `lint`, `test`, `dev` (sin caché), `typecheck`.
5. Primer commit: `chore: setup inicial del monorepo` directo a `main` (antes de que existan tickets, no hace falta branch).

## 2. Packages compartidos primero

Van antes que las apps porque `apps/api` los va a importar desde el día uno.

1. `packages/typescript-config` — `tsconfig.base.json` con `strict: true`.
2. `packages/eslint-config` — reglas compartidas (o evaluar Biome como alternativa, definir y no mezclar ambas).
3. `packages/env` — schema de Zod para validar variables de entorno al boot.
4. `packages/contracts` — vacío por ahora, se va a ir llenando a medida que se define el modelo de dominio (Evento, Inscripción, Asistencia).
5. `packages/db` — instalar Drizzle + driver de Postgres, conectar contra el Supabase de dev con las credenciales en `.env` (no versionado).

## 3. apps/api (NestJS)

1. `nest new api` dentro de `apps/`.
2. Instalar Swagger (`@nestjs/swagger`) y dejarlo andando en `main.ts` desde el primer commit — más fácil mantenerlo vivo desde el arranque que agregarlo después.
3. Habilitar versionado de URI (`/api/v1/...`).
4. Armar `common/` (guards, interceptors, helpers) y `workers/` vacíos, con un placeholder.
5. Endpoint `/health` — primero que cualquier módulo de negocio, sirve para validar que el deploy en Vercel funciona antes de meter lógica.
6. Conectar `packages/db` y `packages/env`.

## 4. apps/web (Next.js)

1. `create-next-app` dentro de `apps/`, TypeScript + App Router.
2. Conectar `packages/contracts` y `packages/env`.
3. Página placeholder que pegue contra `/health` de la api, para validar que la comunicación entre apps funciona antes de construir vistas reales.

## 5. CI/CD

1. `.github/workflows/ci.yml`: en cada PR contra `main`, correr `turbo run lint typecheck test build`.
2. Vercel: crear dos proyectos separados sobre el mismo repo — uno con Root Directory `apps/web`, otro con `apps/api`. Confirmar que el deploy de Nest en serverless de Vercel funciona (puede necesitar un adapter, revisar antes de dar el paso por cerrado).
3. Variables de entorno cargadas en Vercel (no en el repo) para ambos proyectos.

## 6. Modelo de dominio y primeras features

Recién acá arranca el trabajo de las historias que ya están cargadas en Jira (Sprint 1 en adelante): modelo de dominio, reglas de negocio, roles y permisos, stack tecnológico (ya cerrado), contratos de integración con CORE y Analítica.

## 7. Documentación mínima antes de la primera entrega

- `README.md` en la raíz: qué es el proyecto, cómo instalar, cómo correr `apps/web` y `apps/api` en dev, cómo correr las migrations.
- `AGENTS.md` en la raíz (ver archivo aparte) con las convenciones de tickets, commits, PRs y documentación.
- `docs/decisions/` con un ADR corto por cada decisión de arquitectura ya tomada (NestJS vs Fastify, Drizzle vs Prisma, Turborepo vs Nx, contracts a mano vs generados, Supabase compartido vs local) — total 15 minutos de escribir y evita tener que reconstruir el razonamiento de memoria en la defensa oral.

## Orden de prioridad si el tiempo aprieta

Si hay que cortar por apuro antes de la primera entrega, lo mínimo indispensable es: monorepo + packages base + api con Swagger y /health + README. Los workers, el `packages/env` con validación estricta y los ADRs son mejoras de calidad, no bloqueantes para mostrar avance.
