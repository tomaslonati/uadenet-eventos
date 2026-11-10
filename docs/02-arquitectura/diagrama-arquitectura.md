# Diagrama de arquitectura general

> Vista de conjunto del módulo Eventos Académicos dentro de UADEnet. Complementa a [`stack-y-estructura.md`](stack-y-estructura.md) (capas y carpetas) y [`flujo-de-datos-negocio.md`](flujo-de-datos-negocio.md) (secuencia de negocio). Los contratos punto por punto están en [`flujo-de-datos-integraciones.md`](flujo-de-datos-integraciones.md).

## Contexto: el módulo y los demás

```mermaid
flowchart LR
    subgraph Usuarios
        U1[Estudiante]
        U2[Docente]
        U3[Administrativo]
    end

    subgraph Eventos["Módulo Eventos (este repo)"]
        WEB["apps/web<br/>Next.js"]
        API["apps/api<br/>NestJS"]
        DB[("Supabase<br/>Postgres")]
    end

    subgraph Externos["Otros módulos de UADEnet"]
        CORE["CORE (grupo 10)<br/>auth · billetera · notificaciones · bus"]
        BO["Backoffice (grupo 8)<br/>sedes · espacios · tarifas · usuarios"]
        AN["Analítica Institucional"]
        PORT["Portales Estudiante / Docente"]
    end

    U1 & U2 & U3 --> WEB
    WEB -->|"REST + Bearer JWT"| API
    API -->|"Drizzle"| DB

    API -->|"login, JWKS, saldo,<br/>débito / reversa"| CORE
    API -->|"POST /internal/v1/notifications<br/>(recordatorio, reprogramado, cancelado)"| CORE
    API -->|"POST /internal/v1/events"| CORE
    CORE -->|"RabbitMQ"| AN
    CORE -->|"campanita / mail"| PORT
    API -->|"token de servicio (M2M)"| BO
    PORT -->|"GET /api/v1/eventos"| API
```

Reglas de la coordinación de cátedra: identidad, billetera, avisos entre módulos y notificaciones **pasan siempre por CORE**; los pedidos de datos a su dueño (sedes, espacios, tarifas) van **directo** al módulo, con el token de servicio de CORE. Ver [`integraciones.md`](integraciones.md).

## Dentro de `apps/api`

```mermaid
flowchart TB
    subgraph HTTP["Controllers (validan con @repo/contracts)"]
        C1[Eventos]
        C2[Inscripciones]
        C3[Asistencia]
        C4[Usuarios / Auth]
        C5[Locaciones]
    end

    G["CoreJwtGuard<br/>JWKS RS256 + permisos"]

    subgraph Servicios["Servicios de dominio"]
        S1[EventosService]
        S1b["EventosGestionService<br/>editar · cancelar · impacto"]
        S2[InscripcionesService]
        S3[AsistenciaService]
    end

    subgraph Comun["common/ — integraciones"]
        K1["SaldoService<br/>débito · reversa · conciliación"]
        K2["NotificacionesService<br/>recordatorio · avisos"]
        K3["AnaliticaService<br/>eventos de dominio"]
        K4["TarifasService / LocacionesSync<br/>caché de Backoffice"]
        K5[CoreTokenService]
    end

    W["workers/<br/>RecordatoriosService"]
    DB[("packages/db")]

    HTTP --> G --> Servicios
    S1 --> K4 & K3
    S1b --> K1 & K2 & K3 & K4
    S2 --> S1 & K1 & K3
    S3 --> K3
    W --> K2
    Servicios --> DB
    W --> DB
    K1 & K2 & K3 & K4 --> K5
```

## Despliegue

```mermaid
flowchart LR
    GH["GitHub<br/>dev / main"] -->|"push"| VW[Vercel · uadenet-eventos-web]
    GH -->|"push"| VA[Vercel · uadenet-eventos-api]
    VW -->|"NEXT_PUBLIC_API_URL"| VA
    VA --> SB[("Supabase<br/>un proyecto, dev y prod")]
    VA --> RC[CORE en Railway]
```

| Rama | Web | API |
|---|---|---|
| `dev` | `uadenet-eventos-web-dev.vercel.app` | `uadenet-eventos-api-dev.vercel.app` |
| `main` | `uadenet-eventos-web.vercel.app` | `uadenet-eventos-api.vercel.app` |

Dev y prod comparten la misma base (ADR 0011): una migration afecta a los dos (ver [`../04-guias/aplicar-migraciones.md`](../04-guias/aplicar-migraciones.md)). Los procesos periódicos arrancan con `setInterval` cuando la API corre como proceso largo (local). En Vercel, que es serverless, un **cron diario** (`apps/api/vercel.json`, 11:00 UTC) llama a `GET /api/v1/cron/diario`, protegido con `CRON_SECRET`, que sincroniza las locaciones y envía los recordatorios ([ADR 0016](../decisions/0016-cron-diario-de-vercel.md)). Vercel solo ejecuta crons en producción.
