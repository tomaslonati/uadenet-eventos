# Estado de integraciones y acuerdos pendientes

> **Documento vivo y disclaimer formal.** Este documento detalla el estado técnico de cada integración con los módulos externos del TP (CORE, Backoffice Administrativo, Analítica Institucional), lo que se encuentra efectivamente implementado en este repositorio y los puntos pendientes de acuerdo entre equipos.

---

## 1. CORE

### Situación actual y disclaimer
Por directiva de desacople y priorización de alcance local del sprint, **no se consumen por ahora endpoints reales de CORE en vivo**:
1. El equipo de CORE no tiene desplegado un ambiente compartido estable ni cerrado el mecanismo de emisión/verificación de tokens JWT (ver sección de autenticación).
2. Para no bloquear el desarrollo ni los tests del módulo de Eventos, la verificación de saldo y su descuento se mantienen desacoplados y mockeados a través de `SaldoService` (`apps/api/src/common/core/saldo.service.ts`).

### Endpoints y contratos confirmados por CORE (Tablero inter-grupos G10)

| Capacidad | Endpoint en CORE | Scope / Permiso | Detalle técnico |
|---|---|---|---|
| **Token de servicio (M2M)** | `POST /internal/v1/service-auth/token` | Credenciales `events-service` | Body: `{ "clientId": "events-service", "clientSecret": "..." }`. Devuelve JWT corto (~15 min) con scopes pre-asignados. |
| **JWKS (Validación local)** | `GET /.well-known/jwks.json` | Público | Claves públicas RS256 para validar tokens de usuario y de servicio sin llamar a CORE por request. |
| **Gateway y Headers** | `/api/v1/events/*` $\to$ `<SERVICE_URL>/api/v1/*` | Firma `X-Core-Signature` | Reenvía `Authorization: Bearer <JWT>` e inyecta `X-User-Id`, `X-User-Roles`, `X-User-Permissions`, `X-User-Career-Ids`, `X-Correlation-Id`, `X-Core-Timestamp`, `X-Core-Signature`. |
| **Rol y Permiso de Eventos** | Claims `roles` y `permissions` del JWT | **`campus-events:manage`** | Rol en Backoffice/CORE: `OPERATIONS_ADMIN`. Permiso en JWT para gestión de eventos: `campus-events:manage`. Alumnos: `STUDENT`; Docentes: `TEACHER`. |
| **Consulta de saldo propio** | `GET /api/v1/wallets/me` | `wallet:read:self` | Consumido con el JWT del usuario para mostrar saldo disponible en la UI antes de confirmar inscripción paga. |
| **Débito de inscripción** | `POST /internal/v1/wallets/{userId}/debits` | `wallet:debit:any` (service token) | Header obligatorio: `Idempotency-Key: <UUID>`. Body: `{ "amount": "1800.00", "currency": "ARS", "concept": "EVENT_REGISTRATION", "sourceModule": "events", "externalReference": "<inscripcionId>" }`. Respuesta `201` con `{ "transactionId", "type": "DEBIT", "status": "POSTED" }`. Errores (`application/problem+json`): `422 WALLET_INSUFFICIENT_FUNDS`, `404 WALLET_NOT_FOUND`, `409 IDEMPOTENCY_CONFLICT` / `DUPLICATE_REFERENCE`. |
| **Reversión (Baja con reembolso)** | `POST /internal/v1/wallet-transactions/{transactionId}/reversals` | `wallet:debit:any` (service token) | Header: `Idempotency-Key: <UUID>`. Body: `{ "reason": "Baja de inscripción en término", "amount": "1800.00" }`. |
| **Conciliación por referencia** | `GET /internal/v1/wallet-transactions/by-reference?sourceModule=events&externalReference=<inscripcionId>` | Service token | Permite recuperar el estado de un cobro ante corte de red sin duplicar el débito. |
| **Publicación de eventos al bus** | `POST /internal/v1/events` | `events:publish` (service token) | Responde `202 Accepted` y publica en RabbitMQ (`uadenet.events.v1`, routing key = `eventType` con sufijo `.v1`). |
| **Notificaciones al alumno (HU7)** | `POST /internal/v1/notifications` | Service token | Envía avisos a la campanita del portal / correo para recordatorios (`evento.recordatorio`). |

> **Nota sobre corrección de entrega anterior**: En la corrección docente se observó el path `/saldo/descontar` de la especificación inicial de cátedra; en el tablero inter-grupos G10 también especificó el contrato RESTful `/internal/v1/wallets/{userId}/debits`. Hasta la entrega final (2/12) las integraciones corren mockeadas localmente a través de `SaldoService` (`apps/api/src/common/core/saldo.service.ts`) y `CoreTokenService` (`apps/api/src/common/core/core-token.service.ts`).

---

## 2. Backoffice Administrativo

### Situación actual
Toda la integración con Backoffice Administrativo ha sido implementada y tipada punto a punto en el cliente HTTP (`BackofficeClient` en `apps/api/src/common/backoffice/backoffice.client.ts`), respaldada por contratos Zod canónicos en `@repo/contracts/src/backoffice.schema.ts`. Cuando `BACKOFFICE_BASE_URL` no está configurada, la API levanta de forma transparente un mock local (`BackofficeMockController`) que replica fielmente los contratos reales para desarrollo y tests.

### Endpoints implementados y consumidos
1. **Listado de Sedes**:
   - `GET /api/v1/backoffice/sedes`
   - Devuelve la lista de sedes universitarias (`id`, `nombre`, `direccion`, `estado`).
   - Se expone en nuestro backend en `GET /api/v1/sedes` a través de `SedesController`.
2. **Espacios por Sede**:
   - `GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true`
   - Backoffice no cuenta con un listado global de espacios; nuestro servicio `LocacionesSyncService` realiza la sincronización periódica consultando los espacios de cada sede activa, mapeando el nombre de sede y persistiendo el catálogo local en la tabla `locaciones`.
3. **Tarifas Vigentes**:
   - `GET /api/v1/backoffice/tarifas/vigente?concepto={concepto}&fecha={YYYY-MM-DD}`
   - Conceptos soportados según consigna y mapeo canónico:
     - `general` $\to$ `EVENTO_INSCRIPCION_GENERAL`
     - `especial` $\to$ `EVENTO_INSCRIPCION_ESPECIAL`
   - Implementado mediante `TarifasService` con caché en memoria y polling periódico (ADR 0014). Se valida vigencia de tarifa al crear eventos pagos y al momento del cobro de inscripciones. Si la tarifa no está vigente (404), la operación es rechazada con `422 Unprocessable Entity`.
4. **Datos del Usuario Logueado / Consulta de Usuarios**:
   - `GET /api/v1/backoffice/usuarios/{id}`
   - Consumido por `UsuariosService` y expuesto en `GET /api/v1/usuarios/me` (resolviendo el id del usuario autenticado) y `GET /api/v1/usuarios/:id`.

### Puntos pendientes de coordinación con Backoffice
| Punto | Descripción | Estado |
|---|---|---|
| **Disponibilidad de ambiente real** | Validar conectividad cuando el equipo de Backoffice disponibilice la URL base (`BACKOFFICE_BASE_URL`). | Pendiente de despliegue externo |
| **Enriquecimiento de espacios** | Se propuso que Backoffice incluya opcionalmente el nombre de la sede en el DTO de espacios para ahorrar el cruce manual por `sedeId`. No es bloqueante (nuestro sync ya resuelve el cruce). | Opcional |

---

## 3. Analítica Institucional

### Situación actual
Analítica Institucional es un consumidor de eventos emitidos por el módulo de Eventos. El módulo de Eventos ya genera y valida canónicamente los 3 eventos requeridos por la consigna mediante `AnaliticaService` (`apps/api/src/common/analitica/analitica.service.ts`) con tipado estricto Zod (`@repo/contracts/src/analitica.schema.ts`).

### Eventos emitidos por el dominio
1. **`evento.creado`**:
   - Emitido en `EventosService.crear()`.
   - Alimenta métricas de frecuencia y tipología de eventos institucionales.
   - Payload:
     ```json
     {
       "tipo": "evento.creado",
       "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
       "titulo": "Workshop de Testing",
       "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47",
       "sede": "Sede Centro",
       "cupoMaximo": 40,
       "fechaInicio": "2026-10-22T18:00:00.000Z",
       "fechaFin": "2026-10-22T21:00:00.000Z",
       "esPago": true,
       "categoriaPrecio": "especial",
       "emitidoEn": "2026-10-06T20:00:00.000Z"
     }
     ```
2. **`inscripcion.registrada`**:
   - Emitido en `InscripcionesService.crear()`.
   - Alimenta métricas de concurrencia e interés por rol de usuario (`estudiante`, `docente`, `administrativo`).
   - Payload:
     ```json
     {
       "tipo": "inscripcion.registrada",
       "inscripcionId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
       "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
       "usuarioId": "u-10432",
       "rol": "estudiante",
       "pagoConfirmado": true,
       "emitidoEn": "2026-10-06T20:05:00.000Z"
     }
     ```
3. **`asistencia.confirmada`**:
   - Emitido en `AsistenciaService.registrar()`.
   - Alimenta métricas de presentismo efectivo vs. inscripciones totales.
   - Payload:
     ```json
     {
       "tipo": "asistencia.confirmada",
       "inscripcionId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
       "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
       "usuarioId": "u-10432",
       "confirmadaEn": "2026-10-22T18:07:44.000Z",
       "emitidoEn": "2026-10-22T18:07:45.000Z"
     }
     ```

### Flujo de eventos hacia Analítica (Vía CORE y RabbitMQ)
Según las directivas generales de cátedra:
* Ningún módulo publica directo en RabbitMQ ni crea colas ad-hoc.
* Si el módulo de Eventos necesita avisar algo ("pasó tal cosa"), se lo envía a CORE (endpoint/cola designada por CORE).
* CORE se encarga de repartir el mensaje por **RabbitMQ** hacia la cola correspondiente de **Analítica Institucional**.
* Por lo tanto, el contrato de payload de los eventos (`evento.creado`, `inscripcion.registrada`, `asistencia.confirmada`) ya está cerrado y listo; la entrega física se realiza a CORE para que lo distribuya.
