# Flujo de datos — recorrido de negocio

> Diagrama pedido en `../01-proyecto/plan-de-definicion.md` (Fase 2, punto 8) para la 1° Entrega: desde que un administrativo crea un evento hasta que un usuario se inscribe, paga (si aplica), recibe el recordatorio y se le registra la asistencia. Complementa a [`stack-y-estructura.md`](stack-y-estructura.md#flujo-de-datos), que describe las capas técnicas (web → CORE → api → db); este documento describe el recorrido de negocio en sí, con las validaciones de cada HU.

No incluye a Analítica Institucional (consume eventos nuestros, pero su contrato sigue "Pendiente" en [`integraciones.md`](integraciones.md) y no está dentro del alcance que pide `plan-de-definicion.md` para este diagrama) ni a HU5/HU8 (son consultas de lectura, no pasos de este recorrido).

Todo request a `apps/api` requiere un JWT válido de CORE (`common/guards/core-jwt.guard.ts`) — se omite del diagrama para no repetirlo en cada flecha. Hoy ese guard es un placeholder que siempre deja pasar (ver `integraciones.md`); lo que sigue es el flujo objetivo, no el estado actual de la integración.

```mermaid
sequenceDiagram
    actor Admin as Administrativo
    actor Usuario
    participant Web as apps/web
    participant API as apps/api
    participant CORE
    participant DB as packages/db (Postgres)
    participant Worker as Worker recordatorio

    Note over Admin,DB: FASE 1 — Crear evento (HU1)
    Admin->>Web: completa alta (locación, cupo, fecha/hora, gratis/pago)
    Web->>API: POST /eventos
    API->>DB: valida solapamiento de locación en ese rango horario
    alt Locación libre
        API->>DB: INSERT evento
        DB-->>API: evento creado
        API-->>Web: 201 Created
        Web-->>Admin: evento publicado
    else Locación ya reservada
        DB-->>API: conflicto encontrado
        API-->>Web: 409 Conflict
        Web-->>Admin: rechazado por conflicto de locación
    end

    Note over Usuario,DB: FASE 2 — Consultar e inscribirse (HU2, HU3, HU4)
    Usuario->>Web: abre la cartelera
    Web->>API: GET /eventos
    API->>DB: SELECT eventos
    DB-->>API: listado
    API-->>Web: 200 OK
    Web-->>Usuario: nombre, fecha, locación, cupo, si es pago

    Usuario->>Web: elige un evento y confirma inscripción
    Web->>API: POST /inscripciones
    API->>DB: cantidad de inscriptos < cupoMaximo?
    alt Sin cupo disponible
        DB-->>API: cupo agotado
        API-->>Web: 409 rechazado sin cupo
        Web-->>Usuario: "no queda cupo"
    else Cupo disponible
        API->>DB: ¿el usuario ya tiene otra inscripción con horario superpuesto?
        alt Conflicto de horario del usuario
            DB-->>API: conflicto encontrado
            API-->>Web: 409 rechazado por conflicto
            Web-->>Usuario: "ya estás inscripto a algo en ese horario"
        else Sin conflicto
            alt Evento pago
                API->>CORE: descontar precio del saldo institucional
                alt Saldo insuficiente
                    CORE-->>API: rechazado
                    API-->>Web: 409 rechazado por saldo insuficiente
                    Web-->>Usuario: "saldo insuficiente"
                else Saldo suficiente
                    CORE-->>API: descuento confirmado
                    API->>DB: INSERT inscripción (pagoConfirmado = true)
                    DB-->>API: inscripción creada
                    API-->>Web: 201 Created
                    Web-->>Usuario: inscripto (con pago confirmado)
                end
            else Evento gratuito
                API->>DB: INSERT inscripción
                DB-->>API: inscripción creada
                API-->>Web: 201 Created
                Web-->>Usuario: inscripto
            end
        end
    end

    Note over Worker,Usuario: FASE 3 — Recordatorio (HU7), corre solo días después
    loop cron diario
        Worker->>DB: inscripciones activas con fechaInicio - hoy = 7 días
        DB-->>Worker: inscripciones a notificar
        opt hay inscripciones para notificar
            Worker->>CORE: enviar recordatorio (mecanismo pendiente: cola/topic vs REST, ver integraciones.md)
            CORE-->>Usuario: notificación con link al detalle del evento
        end
    end

    Note over Admin,DB: FASE 4 — Registrar asistencia (HU6), el día del evento
    Admin->>Web: marca asistencia del inscripto (mecanismo pendiente: QR, código en sala o manual — ver modelo-dominio.md)
    Web->>API: POST /asistencia
    API->>DB: valida que exista una inscripción activa
    API->>DB: INSERT asistencia (confirmadaEn)
    DB-->>API: asistencia registrada
    API-->>Web: 201 Created
    Web-->>Admin: asistencia confirmada
```

## Notas de lectura

- Las ramas de rechazo (`alt`) son las mismas de los criterios Given/When/Then de HU1/HU3/HU4 en [`../01-proyecto/backlog.md`](../01-proyecto/backlog.md) — no son un agregado del diagrama, son la traducción visual de esos criterios.
- Fase 3 y Fase 4 pasan **días o semanas después** de la Fase 2, no en la misma sesión de usuario — el `loop`/cron de la Fase 3 y el "el día del evento" de la Fase 4 marcan ese salto en el tiempo.
- CORE aparece en tres roles distintos según la fase (autenticación implícita en todo el diagrama, descuento de saldo en Fase 2, envío de notificación en Fase 3) — los tres contratos siguen "Pendiente" en [`integraciones.md`](integraciones.md); nada de esto está implementado contra CORE real todavía, son mocks a construir para la 2° Entrega.
