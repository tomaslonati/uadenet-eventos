# Arquitectura

> Documento vivo. Si cambia el stack o la estructura, se actualiza acá primero y después se ajusta el código — no al revés.

## Stack

- Frontend: **Next.js 16** (App Router), TypeScript.
- Backend: **NestJS**, TypeScript. App separada de `web`, no Route Handlers de Next.
- ORM: **Drizzle** (sin paso de generación, liviano para serverless, agnóstico al proveedor de Postgres).
- Base de datos: **Supabase** (Postgres), un único proyecto compartido de dev para todo el equipo (ver ADR 0011, restaura la estrategia de ADR 0006; ADR 0008 documenta el paso intermedio por Neon).
- Documentación de API: **Swagger/OpenAPI**, generado desde NestJS.
- Monorepo: **Turborepo** + **pnpm** workspaces (ver ADR 0002).
- Deploy: **Vercel**, dos proyectos separados (`apps/web` y `apps/api`) sobre el mismo repo.
- Node: LTS activa (24 al momento de escribir esto — confirmar cuál es la activa antes de bootstrapear si pasó tiempo).

## Estructura del monorepo

```
uadenet-eventos/
├── apps/
│   ├── web/                        # Next.js
│   │   ├── app/
│   │   │   ├── globals.css         # tokens del sistema de diseño + reset + keyframes
│   │   │   ├── layout.tsx          # SesionProvider + Toast global
│   │   │   ├── page.tsx            # login
│   │   │   └── (app)/              # rutas con la shell (header + sidebar)
│   │   │       ├── layout.tsx
│   │   │       ├── cartelera/
│   │   │       ├── eventos/[id]/   # detalle e inscripción
│   │   │       ├── eventos/nuevo/  # alta de evento (wizard)
│   │   │       ├── mis-inscripciones/
│   │   │       ├── cuenta/
│   │   │       ├── gestion/
│   │   │       ├── asistencia/
│   │   │       ├── docente/
│   │   │       └── avisos/
│   │   ├── components/
│   │   │   ├── shell/              # header, sidebar, panel de avisos
│   │   │   ├── ui/                 # botones, badges, campos, modal, toast…
│   │   │   └── eventos/            # vistas de cartelera (tarjetas/tabla/agenda)
│   │   ├── lib/
│   │   │   ├── sesion.tsx          # contexto de perfil, sede, saldo e inscripciones
│   │   │   ├── dominio.ts          # estado del evento, conflictos, cupo
│   │   │   ├── formato.ts          # montos, fechas y horarios
│   │   │   └── mock/               # datos de prueba hasta que exista la API
│   │   └── package.json
│   │
│   └── api/                        # NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── eventos/
│       │   │   │   ├── eventos.controller.ts
│       │   │   │   ├── eventos.service.ts
│       │   │   │   ├── eventos.module.ts
│       │   │   │   ├── eventos.controller.spec.ts
│       │   │   │   └── dto/
│       │   │   ├── inscripciones/
│       │   │   └── asistencia/
│       │   ├── workers/
│       │   │   └── recordatorio-evento.worker.ts
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   │   └── core-jwt.guard.ts
│       │   │   ├── pipes/
│       │   │   │   └── zod-validation.pipe.ts
│       │   │   ├── interceptors/
│       │   │   └── helpers/
│       │   ├── health/
│       │   │   └── health.controller.ts
│       │   ├── main.ts             # bootstrap + Swagger + versionado URI + CORS
│       │   └── app.module.ts
│       ├── test/
│       └── package.json
│
├── packages/
│   ├── contracts/                  # Zod schemas compartidos entre web y api
│   │   └── src/
│   │       ├── evento.schema.ts
│   │       ├── inscripcion.schema.ts
│   │       └── asistencia.schema.ts
│   ├── db/                         # Drizzle: schema, client, migrations, seed
│   │   └── src/
│   │       ├── schema/
│   │       ├── migrations/
│   │       ├── seed.ts
│   │       └── client.ts
│   ├── env/                        # validación de env vars con Zod
│   ├── eslint-config/
│   └── typescript-config/
│
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── AGENTS.md
├── CLAUDE.md
├── README.md
└── .github/workflows/ci.yml
```

## Regla de organización interna de `apps/api`

**Feature-based, no type-based.** Cada módulo de dominio (`eventos/`, `inscripciones/`, `asistencia/`) agrupa su controller, service, DTOs y tests en una misma carpeta — así lo pide el sistema de módulos de NestJS y así se navega más rápido: para tocar "inscripciones" hay una sola carpeta, no cuatro. Lo transversal (guards, pipes, interceptors, helpers de uso general) va en `common/`. Los procesos en background (cron de recordatorios) van en `workers/`, separados de los módulos porque no responden a un request HTTP.

## Regla de organización interna de `apps/web`

**Por ruta, no por tipo de archivo.** Cada pantalla vive en su carpeta de `app/`, con el `.tsx` y su `.module.css` al lado; si necesita partirse en piezas, esas piezas quedan en la misma carpeta. Sólo sube a `components/` lo que usan dos o más pantallas: la shell (`shell/`), los primitivos del sistema de diseño (`ui/`) y las vistas de eventos que comparten cartelera y gestión (`eventos/`). La lógica sin JSX (formato de montos y fechas, estado del evento, detección de conflictos) va en `lib/`, así se puede testear sin montar un componente.

Estilos: CSS Modules con los tokens en `app/globals.css` — ver ADR 0010 y `../03-diseno/sistema-diseno.md`.

Datos: mientras `apps/api` no exponga los endpoints, las pantallas leen de `lib/mock/`. Todo lo que sale de ahí está tipado con las mismas formas que después van a venir de `packages/contracts`, para que el reemplazo sea cambiar el origen y no reescribir la pantalla. La fecha "hoy" del prototipo está fija en `lib/mock/eventos.ts` a propósito: un `new Date()` real haría divergir el render del servidor del render del cliente.

## Flujo de datos

`apps/web` **nunca** consulta la base de datos directo. Todo pasa por `apps/api`:

```
Portal (web) → CORE (gateway + auth) → apps/api (NestJS) → packages/db (Drizzle) → Neon (Postgres)
```

Sin excepciones por ahora: Neon no ofrece un mecanismo de suscripción tipo Realtime, así que las notificaciones en vivo (si se necesitan) van a depender de lo que defina CORE — a evaluar (ver `integraciones.md`).

`packages/contracts` (Zod) es el contrato compartido: `apps/api` lo usa para validar requests (pipes de Nest), `apps/web` lo usa para validar formularios y tipar responses. Un solo lugar de verdad para la forma de los datos — no duplicar DTOs entre apps.

## Capas dentro de `apps/api` (por módulo)

1. **Controller** — recibe el request, valida con el schema de `packages/contracts`, delega al service. No tiene lógica de negocio.
2. **Service** — reglas de negocio (ej. validar no-solapamiento de locación/usuario, calcular si hay cupo).
3. **Repository / Drizzle client** (`packages/db`) — acceso a datos, sin lógica de negocio.

## Seguridad / auth

`common/guards/core-jwt.guard.ts` valida el token emitido por CORE en cada request. El mecanismo exacto (secreto compartido vs JWKS) todavía no está cerrado — ver `integraciones.md`. Hasta que se defina, el guard queda como placeholder documentado, no implementado a ciegas.
