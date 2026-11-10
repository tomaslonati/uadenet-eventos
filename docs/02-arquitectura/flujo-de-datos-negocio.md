# Flujo de datos — recorrido de negocio

> Diagrama pedido en `../01-proyecto/plan-de-definicion.md` (Fase 2, punto 8) para la 1° Entrega: desde que un administrativo crea un evento hasta que un usuario se inscribe, paga (si aplica), recibe el recordatorio y se le registra la asistencia. Complementa a [`stack-y-estructura.md`](stack-y-estructura.md#flujo-de-datos), que describe las capas técnicas (web → CORE → api → db); este documento describe el recorrido de negocio en sí, con las validaciones de cada HU.

No incluye a Analítica Institucional (consume eventos nuestros, pero su contrato sigue "Pendiente" en [`integraciones.md`](integraciones.md) y no está dentro del alcance que pide `plan-de-definicion.md` para este diagrama) ni a HU5/HU8 (son consultas de lectura, no pasos de este recorrido).

Todo request a `apps/api` requiere un JWT válido de CORE (`common/guards/core-jwt.guard.ts`, firma RS256 contra el JWKS de CORE) — se omite del diagrama para no repetirlo en cada flecha. La Fase 5 (gestión del evento) se agregó después y se dibuja en un diagrama aparte, más abajo.

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
    Admin->>Web: marca asistencia del inscripto (QR o manual — ver modelo-dominio.md)
    Web->>API: POST /asistencia
    API->>DB: valida que exista una inscripción activa
    API->>DB: INSERT asistencia (confirmadaEn)
    DB-->>API: asistencia registrada
    API-->>Web: 201 Created
    Web-->>Admin: asistencia confirmada
```

## Fase 5 — Gestión del evento por su creador

Pasa en cualquier momento entre la Fase 1 y el inicio del evento. Solo lo hace quien creó el evento ([ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md)).

```mermaid
sequenceDiagram
    actor Admin as Administrativo (creador)
    actor Inscripto
    participant Web as apps/web
    participant API as apps/api
    participant CORE
    participant DB as packages/db (Postgres)

    Note over Admin,DB: Editar
    Admin->>Web: cambia fecha, locación, cupo, título…
    Web->>API: PATCH /eventos/:id
    API->>DB: ¿publicado, sin empezar? ¿cupo >= inscriptos? ¿locación libre? ¿algún inscripto con otro evento ese horario?
    alt Alguna regla falla
        API-->>Web: 409 con el motivo
        Web-->>Admin: lo muestra y no guarda
    else Cambia fecha o locación
        API->>DB: UPDATE evento (reprogramadoEn = ahora)
        loop por cada inscripto
            API->>CORE: POST /internal/v1/notifications (EVENT_RESCHEDULED)
        end
        API-->>Web: 200 + cantidad de avisados
        Note over Inscripto: puede cancelar su inscripción hasta el inicio, sin el límite de 24 hs
    else Cambia título, descripción o cupo
        API->>DB: UPDATE evento
        API-->>Web: 200, sin avisos
    end

    Note over Admin,DB: Cancelar
    Admin->>Web: pide cancelar
    Web->>API: GET /eventos/:id/impacto
    API-->>Web: inscriptos, monto a reembolsar
    Web-->>Admin: confirmación con los números y motivo obligatorio
    Admin->>Web: confirma
    Web->>API: POST /eventos/:id/cancelacion
    API->>DB: ¿sin asistencias y sin empezar? evento.estado = cancelado
    loop por cada inscripción (de a 5)
        opt era paga
            API->>CORE: conciliar cobro y revertir (si no estaba REVERSED)
            CORE-->>API: reversa confirmada o fallo
        end
        API->>DB: inscripción = cancelada (reembolsadoEn si se devolvió)
        API->>CORE: POST /internal/v1/notifications (EVENT_CANCELLED)
    end
    API-->>Web: reembolsados, pendientes, notificados
    opt quedaron reembolsos pendientes
        Admin->>Web: reintentar reembolsos
        Web->>API: POST /eventos/:id/cancelacion (misma llamada)
        Note over API: solo reintenta los pendientes: no re-avisa ni devuelve dos veces
    end
```

## Notas de lectura

- Las ramas de rechazo (`alt`) son las mismas de los criterios Given/When/Then de HU1/HU3/HU4 en [`../01-proyecto/backlog.md`](../01-proyecto/backlog.md) — no son un agregado del diagrama, son la traducción visual de esos criterios.
- Fase 3 y Fase 4 pasan **días o semanas después** de la Fase 2, no en la misma sesión de usuario — el `loop`/cron de la Fase 3 y el "el día del evento" de la Fase 4 marcan ese salto en el tiempo.
- CORE aparece en varios roles según la fase: autenticación implícita en todo el diagrama, descuento de saldo en la Fase 2, envío de notificación en la Fase 3, y reembolsos y avisos en la Fase 5. Todo está implementado y probado contra el CORE simulado de `apps/api`; el estado contra el CORE real, y lo que falta confirmar, está en [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md).
- Cancelar la propia inscripción (una persona, no el creador) no está dibujado: es el mismo circuito de reembolso de la Fase 5 para una sola inscripción, hasta 24 hs antes del inicio.
