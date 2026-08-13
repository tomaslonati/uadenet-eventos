# uadenet-eventos

Módulo **Eventos Académicos** del sistema UADEnet (TPO Desarrollo de Aplicaciones II, UADE, 2Q 2026). Administrativos gestionan eventos (locación, cupo); estudiantes/docentes/administrativos consultan e inscriben; verificación de asistencia; recordatorio automático. Contexto completo, fechas de entrega y dependencias con otros grupos: [`docs/00-overview.md`](docs/00-overview.md).

## Stack

Next.js (`apps/web`) + NestJS (`apps/api`) + Drizzle + Neon (Postgres serverless) + TypeScript, monorepo con Turborepo + pnpm, deploy en Vercel. Detalle en [`docs/01-arquitectura.md`](docs/01-arquitectura.md) y el porqué de cada elección en [`docs/decisions/`](docs/decisions/).

## Instalar

```bash
pnpm install
```

Requiere Node LTS activa y pnpm (`corepack enable`).

## Correr en dev

```bash
pnpm dev
```

Levanta `apps/api` en http://localhost:3000 y `apps/web` en http://localhost:3001. `apps/web` pega contra `apps/api` en `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`).

Documentación de la API (Swagger): `http://localhost:3000/api/docs`.
Estado de `apps/api` visto desde el portal: `http://localhost:3001/health`.

### Pantallas

`apps/web` arranca en `/` (login: elegís el perfil con el que querés recorrer el portal). Desde ahí: `/cartelera`, `/eventos/[id]`, `/eventos/nuevo`, `/mis-inscripciones`, `/cuenta`, `/gestion`, `/asistencia`, `/docente` y `/avisos`.

Todavía no consumen `apps/api`: los datos salen de `apps/web/lib/mock/`. El diseño y sus tokens están en [`docs/05-sistema-diseno.md`](docs/05-sistema-diseno.md).

## Variables de entorno

`packages/env` valida al boot con Zod. Copiar a `.env` en la raíz (no versionado):

```
DATABASE_URL=postgres://...   # branch de Neon (ver ADR 0008 en docs/decisions/)
NODE_ENV=development
```

**Pendiente:** las credenciales de Neon (branch base de dev) las comparte quien haya armado el proyecto — pedirlas al equipo, no están en el repo.

## Migrations

Con `packages/db`:

```bash
pnpm --filter @repo/db db:generate   # genera la migration a partir del schema de Drizzle
pnpm --filter @repo/db db:migrate    # la aplica
```

El schema (`packages/db/src/schema/`) todavía está vacío — se completa cuando se cierre `docs/02-modelo-dominio.md`. No correr migrations contra la branch base compartida sin avisar al equipo (ver `AGENTS.md`).

## Verificar antes de un PR

```bash
turbo run lint typecheck test build
```

## Pendiente de configurar (fuera de este bootstrap)

- Dos proyectos Vercel sobre este mismo repo: uno con Root Directory `apps/web`, otro con `apps/api` (confirmar que el deploy serverless de Nest funciona, puede necesitar un adapter).
- Variables de entorno cargadas en Vercel (no en el repo) para ambos proyectos.

## Convenciones

Ver [`AGENTS.md`](AGENTS.md) — tickets, commits, PRs, documentación y reglas de código.
