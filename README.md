# uadenet-eventos

Módulo **Eventos Académicos** del sistema UADEnet (TPO Desarrollo de Aplicaciones II, UADE, 2Q 2026). Administrativos gestionan eventos (locación, cupo); estudiantes/docentes/administrativos consultan e inscriben; verificación de asistencia; recordatorio automático. Contexto completo, fechas de entrega y dependencias con otros grupos: [`docs/01-proyecto/overview.md`](docs/01-proyecto/overview.md).

## Stack

Next.js (`apps/web`) + NestJS (`apps/api`) + Drizzle + Supabase (Postgres) + TypeScript, monorepo con Turborepo + pnpm, deploy en Vercel. Detalle en [`docs/02-arquitectura/stack-y-estructura.md`](docs/02-arquitectura/stack-y-estructura.md) y el porqué de cada elección en [`docs/decisions/`](docs/decisions/).

```
apps/api                 NestJS: API REST, Swagger, CORE y Backoffice simulados, cron
apps/web                 Next.js: portal (cartelera, inscripciones, gestión, asistencia)
packages/contracts       DTOs y schemas Zod compartidos entre api y web
packages/db              schema de Drizzle, migrations y seed
packages/env             validación de variables de entorno al boot
packages/eslint-config   config de ESLint compartida
packages/typescript-config  tsconfig base
```

## Levantar el proyecto en local

Requiere **Node >= 20.12**, pnpm 10.26.2 y **Docker** (para la base local). Para pnpm, `corepack enable pnpm`; si en Windows falla por permisos (escribe en `C:\Program Files\nodejs`), sirve `npm install -g pnpm@10.26.2`.

1. **Base de datos.** Un Postgres 16 en Docker, en el puerto `54330`:

   ```bash
   docker run -d --name uadenet-eventos-db -e POSTGRES_PASSWORD=postgres -p 54330:5432 postgres:16
   ```

   Las veces siguientes alcanza con `docker start uadenet-eventos-db`.

2. **Variables de entorno.** Un `.env` en la raíz del repo (no está versionado) que apunte a esa base:

   ```
   DATABASE_URL=postgres://postgres:postgres@localhost:54330/postgres
   NODE_ENV=development
   ```

   No hace falta nada más: sin `CORE_BASE_URL` ni `BACKOFFICE_BASE_URL` la API usa el CORE y el Backoffice simulados (ver [Variables de entorno](#variables-de-entorno)).

3. **Dependencias.**

   ```bash
   pnpm install
   ```

4. **Tablas.** Aplica las migrations de `packages/db` sobre la base del `.env`:

   ```bash
   pnpm --filter @repo/db db:migrate
   ```

5. **Levantar.**

   ```bash
   pnpm dev
   ```

   Compila los paquetes compartidos (`packages/*`) y levanta `apps/api` en http://localhost:3000 y `apps/web` en http://localhost:3001. Las sedes y locaciones las carga la API sola al arrancar, desde el Backoffice simulado. Para entrar, abrir http://localhost:3001 y usar alguna de las [cuentas de demo](#pantallas).

## Correr en dev

Con la base y el `.env` listos, `pnpm dev` levanta `apps/api` en http://localhost:3000 y `apps/web` en http://localhost:3001. `apps/web` pega contra `apps/api` en `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`).

Documentación de la API (Swagger): `http://localhost:3000/api/docs`.
Estado de `apps/api` visto desde el portal: `http://localhost:3001/health`.

### Pantallas

`apps/web` arranca en `/` (login con mail institucional y contraseña). El rol sale de la cuenta con la que entrás. En dev (sin `CORE_BASE_URL`) el login lo resuelve el CORE simulado de la API, con las cuentas definidas en `apps/api/src/common/core/core-mock.controller.ts`; en prod (con `CORE_BASE_URL`) lo resuelve el CORE real.

| Perfil | Mail | Contraseña |
| :---- | :---- | :---- |
| Administrativo | `m.ibarra@uadenet.edu` | `admin.2026` |
| Docente | `e.ruiz@uadenet.edu` | `docente.2026` |
| Estudiante | `t.vidal@uadenet.edu` | `alumno.2026` |

El CORE simulado también acepta las cuentas `test.admin`, `test.docente` y `test.estudiante` (`@uade.edu.ar`) que lista la pantalla de login, con las mismas contraseñas que esa pantalla.

Son credenciales de demo, no secretos: se van del código cuando el acceso se valide contra el directorio de la universidad. La pantalla de login las lista para no tener que abrir el código.

Desde ahí: `/cartelera`, `/eventos/[id]` (con el panel de gestión para quien creó el evento), `/eventos/nuevo`, `/eventos/[id]/editar`, `/mis-inscripciones`, `/cuenta`, `/gestion`, `/asistencia` y `/avisos`.

Todas consumen `apps/api`. Con `CORE_BASE_URL` sin definir, la API monta un CORE y un Backoffice simulados en el mismo proceso (login con las cuentas de la tabla de arriba, billetera, notificaciones, sedes y tarifas), así que se puede probar todo en local sin depender de otros grupos. Con `CORE_BASE_URL` definida habla con el CORE real y las cuentas son las de CORE. **Dev está mockeado y prod usa el CORE real**: el CORE no respondía bien y la entrega 2 admite integraciones simuladas (ver [ADR 0018](docs/decisions/0018-core-simulado-en-dev-y-real-en-prod.md)). El estado del CORE simulado (saldos, notificaciones) está en memoria y se reinicia con la API. El diseño y sus tokens están en [`docs/03-diseno/sistema-diseno.md`](docs/03-diseno/sistema-diseno.md); un recorrido para presentar el módulo, en [`docs/04-guias/guion-demo.md`](docs/04-guias/guion-demo.md).

## Variables de entorno

`packages/env` valida al boot con Zod y carga el `.env` de la raíz (no versionado) si existe. Solo `DATABASE_URL` hace falta para levantar la API en local (sin definir apunta a un Postgres en `localhost:5432`); todo lo demás tiene un valor por defecto o activa un modo simulado:

```
DATABASE_URL=postgres://...   # base local (ver arriba) o el Supabase compartido de dev (ADR 0011 en docs/decisions/)
NODE_ENV=development
PORT=                         # puerto de la API; default 3000

# Opcionales. Sin ellas la API monta un CORE y un Backoffice simulados en el mismo proceso.
CORE_BASE_URL=                # CORE real (grupo 10). Con esto definido, el login y la billetera son los de CORE
CORE_CLIENT_ID=               # default: events-service
CORE_CLIENT_SECRET=           # secreto de servicio de events-service
CORE_GATEWAY_SECRET=          # valida la firma X-Core-Signature del gateway de CORE; sin esto no se chequea
BACKOFFICE_BASE_URL=          # Backoffice real (grupo 8)
FRONTEND_BASE_URL=            # base de los links de los avisos; default https://uadenet-eventos.vercel.app
CRON_SECRET=                  # secreto del cron de Vercel; sin esto, /api/v1/cron/diario rechaza todo
```

`apps/web` toma `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`) en el **build**: en Vercel hay que definirla por entorno (dev apunta a la API de dev, prod a la de prod).

**Pendiente:** las credenciales de Supabase (proyecto compartido de dev) las comparte quien haya armado el proyecto — pedirlas al equipo, no están en el repo.

## Migrations

Con `packages/db`:

```bash
pnpm --filter @repo/db db:generate   # genera la migration a partir del schema de Drizzle
pnpm --filter @repo/db db:migrate    # la aplica
pnpm --filter @repo/db db:seed       # inserta el usuario demo (seed-admin-demo); idempotente
```

Las migrations generadas viven en `packages/db/src/migrations/`.

El schema (`packages/db/src/schema/`) tiene `usuarios`, `locaciones`, `eventos`, `inscripciones` y `asistencias`, según [`docs/02-arquitectura/modelo-dominio.md`](docs/02-arquitectura/modelo-dominio.md). Si no tenés acceso directo al pooler de sesión, [`docs/04-guias/aplicar-migraciones.md`](docs/04-guias/aplicar-migraciones.md) explica cómo aplicar el SQL a mano y registrarlo (y cuál está pendiente).

Dos cosas antes de correr `db:migrate`:

- **No usar la cadena del pooler de transacciones** (puerto `6543`). `drizzle-kit` necesita prepared statements y ese modo no los soporta — el comando se queda colgado sin dar error. Para migrations va la conexión directa o el pooler de sesión (`5432`). La app sí usa el pooler de transacciones, por eso `packages/db/src/client.ts` pasa `{ prepare: false }`.
- **Avisar al equipo antes**, porque corre contra el proyecto Supabase compartido de dev: el free tier no tiene branching (ver ADR 0011 en [`docs/decisions/`](docs/decisions/)).

## Verificar antes de un PR

```bash
turbo run lint typecheck test build
```

## Despliegue

| Rama | Front (`apps/web`) | Back (`apps/api`) |
| :---- | :---- | :---- |
| `dev` | https://uadenet-eventos-web-dev.vercel.app | https://uadenet-eventos-api-dev.vercel.app (Swagger en `/api/docs`) |
| `main` | https://uadenet-eventos-web.vercel.app | https://uadenet-eventos-api.vercel.app (Swagger en `/api/docs`) |

Dos proyectos de Vercel sobre este repo: `uadenet-eventos-api` (Root Directory `apps/api`) y `uadenet-eventos-web` (`apps/web`). La rama `dev` despliega los entornos de dev y `main` los de prod; el mapa de URLs y de variables está en [`docs/02-arquitectura/diagrama-arquitectura.md`](docs/02-arquitectura/diagrama-arquitectura.md). Dev y prod comparten la base de Supabase: una migration afecta a los dos.

Los procesos periódicos (recordatorios, polling de tarifas, sincronización de locaciones) arrancan con `setInterval` cuando la API corre como proceso largo (`pnpm dev`, `pnpm start`). En Vercel los reemplaza un cron diario (`apps/api/vercel.json`) que llama a `/api/v1/cron/diario`; requiere definir `CRON_SECRET` en el proyecto de la API (entorno Production). Es un solo cron por día porque es lo que admite el plan Hobby ([ADR 0016](docs/decisions/0016-cron-diario-de-vercel.md)).

## Convenciones

Ver [`AGENTS.md`](AGENTS.md) — tickets, commits, PRs, documentación y reglas de código.

## Documentación

Toda la documentación del proyecto vive en [`docs/`](docs/), con un índice en [`docs/README.md`](docs/README.md): contexto y backlog en `01-proyecto/`, arquitectura y contratos en `02-arquitectura/`, sistema de diseño en `03-diseno/`, guías paso a paso en `04-guias/` y los ADRs en `decisions/`.
