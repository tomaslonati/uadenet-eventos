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
│   │   │       ├── cartelera/      # listado con búsqueda y filtros
│   │   │       ├── eventos/
│   │   │       │   ├── formulario-evento.tsx      # el wizard: alta y edición
│   │   │       │   ├── nuevo/                     # alta de evento
│   │   │       │   └── [id]/                      # detalle, inscripción y panel del creador
│   │   │       │       ├── panel-organizador.tsx  # inscriptos, presentismo, CSV, cancelar
│   │   │       │       └── editar/                # edición del evento
│   │   │       ├── mis-inscripciones/
│   │   │       ├── cuenta/
│   │   │       ├── gestion/
│   │   │       ├── asistencia/
│   │   │       └── avisos/         # notificaciones de CORE del usuario
│   │   ├── components/
│   │   │   ├── shell/              # header y sidebar
│   │   │   ├── ui/                 # botones, badges, campos, modal, toast…
│   │   │   └── eventos/            # vistas de cartelera (tarjetas/tabla/agenda)
│   │   ├── lib/
│   │   │   ├── api.ts              # cliente de apps/api y adaptación a los tipos de las pantallas
│   │   │   ├── sesion.tsx          # contexto de perfil, sede, saldo, eventos e inscripciones
│   │   │   ├── dominio.ts          # estado del evento, conflictos, cupo, filtros, qué se puede gestionar
│   │   │   ├── vista-evento.ts     # campos derivados que usan todas las vistas
│   │   │   └── formato.ts          # montos, fechas y horarios
│   │   └── package.json
│   │
│   └── api/                        # NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── eventos/
│       │   │   │   ├── eventos.controller.ts
│       │   │   │   ├── eventos.service.ts           # alta, listado, cupo
│       │   │   │   ├── eventos-gestion.service.ts   # editar, cancelar con reembolso, impacto (ADR 0015)
│       │   │   │   ├── eventos.module.ts
│       │   │   │   ├── *.spec.ts
│       │   │   │   └── dto/
│       │   │   ├── inscripciones/
│       │   │   ├── asistencia/
│       │   │   ├── locaciones/         # catálogo sincronizado desde Backoffice
│       │   │   ├── usuarios/
│       │   │   └── auth/
│       │   ├── workers/
│       │   │   └── recordatorios.service.ts   # HU7: recordatorio a los 7 días
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   │   └── core-jwt.guard.ts
│       │   │   ├── core/          # integración con CORE: token M2M, JWKS, saldo, notificaciones (+ CORE simulado)
│       │   │   ├── backoffice/    # integración con Backoffice: sedes, espacios, tarifas (+ Backoffice simulado)
│       │   │   ├── analitica/     # eventos de dominio hacia el bus de CORE
│       │   │   ├── decorators/
│       │   │   └── pipes/
│       │   │       └── zod-validation.pipe.ts
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
│   │       ├── asistencia.schema.ts
│   │       ├── analitica.schema.ts
│   │       ├── backoffice.schema.ts
│   │       └── core.schema.ts
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

Datos: las pantallas leen de `apps/api` a través de `lib/api.ts`, que también adapta lo que devuelve la API (fechas ISO, descripción con tipo y disertante) a los tipos que usan las vistas. `lib/sesion.tsx` carga eventos, inscripciones, locaciones, tarifas y saldo una vez por sesión y los comparte; las acciones que cambian datos (inscribirse, crear, editar, cancelar) recargan ese estado al terminar.

## Flujo de datos

`apps/web` **nunca** consulta la base de datos directo. Todo pasa por `apps/api`:

```
Portal (web) → CORE (gateway + auth) → apps/api (NestJS) → packages/db (Drizzle) → Supabase (Postgres)
```

Sin excepciones por ahora: Supabase Realtime no está en uso (ver ADR 0011), así que las notificaciones en vivo (si se necesitan) van a depender de lo que defina CORE — a evaluar (ver `integraciones.md`).

Esto es la vista técnica por capas. Para el recorrido de negocio completo (crear evento → inscribirse → pagar → recordatorio → asistencia), con las validaciones de cada HU, ver [`flujo-de-datos-negocio.md`](flujo-de-datos-negocio.md).

`packages/contracts` (Zod) es el contrato compartido: `apps/api` lo usa para validar requests (pipes de Nest), `apps/web` lo usa para validar formularios y tipar responses. Un solo lugar de verdad para la forma de los datos — no duplicar DTOs entre apps.

## Capas dentro de `apps/api` (por módulo)

1. **Controller** — recibe el request, valida con el schema de `packages/contracts`, delega al service. No tiene lógica de negocio.
2. **Service** — reglas de negocio (ej. validar no-solapamiento de locación/usuario, calcular si hay cupo, decidir si un evento se puede editar o cancelar). Cuando un módulo tiene una parte que depende de CORE y otra que no, se parte en dos services: `EventosService` (cartelera, sin CORE) y `EventosGestionService` (reembolsos y avisos).
3. **Repository / Drizzle client** (`packages/db`) — acceso a datos, sin lógica de negocio.

## Seguridad / auth

`common/guards/core-jwt.guard.ts` valida el token emitido por CORE en cada request: firma RS256 y vencimiento contra el JWKS de CORE, y el permiso `@RequierePermiso('campus-events:manage')` donde corresponde. Además, cada módulo verifica la pertenencia (por ejemplo, "solo el creador del evento"). El detalle de quién puede qué está en [`roles-y-permisos.md`](roles-y-permisos.md); el panorama general, en [`diagrama-arquitectura.md`](diagrama-arquitectura.md).
