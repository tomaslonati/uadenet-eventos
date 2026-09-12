# uadenet-eventos

Módulo **Eventos Académicos** del sistema UADEnet (TPO Desarrollo de Aplicaciones II, UADE, 2Q 2026). Administrativos gestionan eventos (locación, cupo); estudiantes/docentes/administrativos consultan e inscriben; verificación de asistencia; recordatorio automático. Contexto completo, fechas de entrega y dependencias con otros grupos: [`docs/01-proyecto/overview.md`](docs/01-proyecto/overview.md).

## Stack

Next.js (`apps/web`) + NestJS (`apps/api`) + Drizzle + Supabase (Postgres) + TypeScript, monorepo con Turborepo + pnpm, deploy en Vercel. Detalle en [`docs/02-arquitectura/stack-y-estructura.md`](docs/02-arquitectura/stack-y-estructura.md) y el porqué de cada elección en [`docs/decisions/`](docs/decisions/).

## Instalar

```bash
pnpm install
```

Requiere **Node >= 20** y pnpm 10.26.2. Para pnpm, `corepack enable pnpm`; si en Windows falla por permisos (escribe en `C:\Program Files\nodejs`), sirve `npm install -g pnpm@10.26.2`.

## Correr en dev

```bash
pnpm dev
```

Levanta `apps/api` en http://localhost:3000 y `apps/web` en http://localhost:3001. `apps/web` pega contra `apps/api` en `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`).

Documentación de la API (Swagger): `http://localhost:3000/api/docs`.
Estado de `apps/api` visto desde el portal: `http://localhost:3001/health`.

### Pantallas

`apps/web` arranca en `/` (login con mail institucional y contraseña). El rol sale de la cuenta con la que entrás: el prototipo tiene tres usuarios hardcodeados en `apps/web/lib/sesion.tsx`, uno por perfil.

| Perfil | Mail | Contraseña |
| :---- | :---- | :---- |
| Administrativo | `m.ibarra@uadenet.edu` | `admin.2026` |
| Docente | `e.ruiz@uadenet.edu` | `docente.2026` |
| Estudiante | `t.vidal@uadenet.edu` | `alumno.2026` |

Son credenciales de demo, no secretos: se van del código cuando el acceso se valide contra el directorio de la universidad. La pantalla de login las lista para no tener que abrir el código.

Desde ahí: `/cartelera`, `/eventos/[id]`, `/eventos/nuevo`, `/mis-inscripciones`, `/cuenta`, `/gestion`, `/asistencia`, `/docente` y `/avisos`.

Todavía no consumen `apps/api`: los datos salen de `apps/web/lib/mock/`. El diseño y sus tokens están en [`docs/03-diseno/sistema-diseno.md`](docs/03-diseno/sistema-diseno.md).

## Variables de entorno

`packages/env` valida al boot con Zod. Copiar a `.env` en la raíz (no versionado):

```
DATABASE_URL=postgres://...   # proyecto Supabase compartido de dev (ver ADR 0011 en docs/decisions/)
NODE_ENV=development
```

**Pendiente:** las credenciales de Supabase (proyecto compartido de dev) las comparte quien haya armado el proyecto — pedirlas al equipo, no están en el repo.

**Ojo:** hoy nada carga el `.env` automáticamente. `packages/env` valida `process.env`, pero ni `nest start` ni `drizzle-kit` leen el archivo. Hasta que se resuelva, hay que exportar las variables en la shell o usar `node --env-file=.env`.

## Migrations

Con `packages/db`:

```bash
pnpm --filter @repo/db db:generate   # genera la migration a partir del schema de Drizzle
pnpm --filter @repo/db db:migrate    # la aplica
```

El schema (`packages/db/src/schema/`) tiene `usuarios`, `locaciones`, `eventos`, `inscripciones` y `asistencias`, según [`docs/02-arquitectura/modelo-dominio.md`](docs/02-arquitectura/modelo-dominio.md).

Dos cosas antes de correr `db:migrate`:

- **No usar la cadena del pooler de transacciones** (puerto `6543`). `drizzle-kit` necesita prepared statements y ese modo no los soporta — el comando se queda colgado sin dar error. Para migrations va la conexión directa o el pooler de sesión (`5432`). La app sí usa el pooler de transacciones, por eso `packages/db/src/client.ts` pasa `{ prepare: false }`.
- **Avisar al equipo antes**, porque corre contra el proyecto Supabase compartido de dev: el free tier no tiene branching (ver ADR 0011 en [`docs/decisions/`](docs/decisions/)).

## Verificar antes de un PR

```bash
turbo run lint typecheck test build
```

## Pendiente de configurar (fuera de este bootstrap)

- Dos proyectos Vercel sobre este mismo repo: uno con Root Directory `apps/web`, otro con `apps/api` (confirmar que el deploy serverless de Nest funciona, puede necesitar un adapter).
- Variables de entorno cargadas en Vercel (no en el repo) para ambos proyectos.

## Convenciones

Ver [`AGENTS.md`](AGENTS.md) — tickets, commits, PRs, documentación y reglas de código.

## Documentación

Toda la documentación del proyecto vive en [`docs/`](docs/), con un índice en [`docs/README.md`](docs/README.md): contexto y backlog en `01-proyecto/`, arquitectura y contratos en `02-arquitectura/`, sistema de diseño en `03-diseno/`, guías paso a paso en `04-guias/` y los ADRs en `decisions/`.
