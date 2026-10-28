# Estado de integraciones y contratos implementados

> **Documento vivo.** Este documento detalla la implementación técnica de cada integración con los módulos externos del TP (CORE, Backoffice Administrativo, Analítica Institucional), los contratos Zod en `@repo/contracts` y los servicios HTTP en `apps/api`.

---

## 1. CORE

### Situación actual
La integración completa con CORE está implementada de punta a punta en `apps/api/src/common/core/` y `apps/api/src/common/guards/core-jwt.guard.ts`, respaldada por contratos Zod canónicos en `@repo/contracts/src/core.schema.ts`. Cuando `CORE_BASE_URL` no está definida, la API monta automáticamente `CoreMockController` (`/api/v1/core/**`) con criptografía RS256 real, idempotencia de billetera y bus de eventos para desarrollo local y tests e2e; al definir `CORE_BASE_URL`, todos los servicios apuntan sin cambios al servidor real de CORE.

### Capacidades y endpoints implementados (Swagger: `https://core-api-production-e458.up.railway.app/docs`)

| Capacidad | Endpoint en CORE | Servicio / Guard en `apps/api` | Detalle técnico |
|---|---|---|---|
| **Login / Refresh / Logout / Me** | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` | `AuthService` + `AuthController` + `apps/web/lib/sesion.tsx` | Autentica con `{ email, password }`, recibe `{ accessToken, expiresIn, user: { id, email, careerIds, roles, permissions, status } }`, hidrata la sesión en `apps/web` y consulta el saldo institucional con el Bearer token. |
| **JWKS (Validación local RS256)** | `GET /.well-known/jwks.json` | `CoreJwksService` + `CoreJwtGuard` | Descarga y cachea las claves públicas RSA (`JWK`, ej. `kid: "dev-key-1"`), verifica firma `RS256` (`node:crypto`), `kid` y `exp` de cada `Authorization: Bearer <JWT>`. |
| **Gateway y Firma HMAC** | Headers `X-User-*`, `X-Core-Signature` | `CoreJwtGuard` | Verifica `X-Core-Signature` (`HMAC-SHA256` con `CORE_GATEWAY_SECRET`), extrae `sub`, `roles`, `permissions`, `careerIds`, hace upsert del usuario en la tabla local `usuarios` y autoriza `@RequierePermiso('campus-events:manage')`. |
| **Token de servicio (M2M)** | `POST /internal/v1/service-auth/token` | `CoreTokenService` | Envía `{ "clientId": "events-service", "clientSecret": "..." }` y cachea el JWT en memoria (`expiresIn: 900`, `tokenType: "Bearer"`). Se inyecta como `Bearer` en las llamadas hacia CORE y Backoffice. |
| **Consulta de saldo propio** | `GET /api/v1/wallets/me` / `GET /internal/v1/wallets/{userId}` | `SaldoService.consultarSaldo()` | Devuelve `{ walletId, userId, balance, currency: "ARS", updatedAt }`. Expuesto hacia el cliente en `GET /api/v1/usuarios/me/saldo`. |
| **Débito de inscripción** | `POST /internal/v1/wallets/{userId}/debits` | `SaldoService.descontar()` | Envía header `Idempotency-Key: <UUID>` y body `{ "amount": "1800.00", "currency": "ARS", "concept": "EVENT_REGISTRATION", "sourceModule": "events", "externalReference": "<inscripcionId>", "description": "..." }`. Mapea `422 WALLET_INSUFFICIENT_FUNDS` a `SALDO_INSUFICIENTE`. |
| **Conciliación por referencia** | `GET /internal/v1/wallet-transactions/by-reference` | `SaldoService.conciliarPorReferencia()` | Invocado automáticamente ante `409 DUPLICATE_REFERENCE` o corte de red durante el débito para recuperar la transacción confirmada (`transactionId`, `status`, `balanceAfter`, `originalTransactionId`) sin cobrar dos veces. |
| **Reversión (Compensación)** | `POST /internal/v1/wallet-transactions/{transactionId}/reversals` | `SaldoService.revertir()` | Si falla la persistencia local de la inscripción tras un débito exitoso, `InscripcionesService` ejecuta la reversa automática con `Idempotency-Key` UUID. |
| **Publicación de eventos al bus** | `POST /internal/v1/events` | `AnaliticaService` + `NotificacionesService` | Envía el sobre estándar v1 (`specVersion: "1.0"`, `eventId`, `eventType`, `source: "events"`, `occurredAt`, `subject`, `correlationId`, `actor: { type: "service", id: "events-service" }`, `data`). |
| **Notificaciones al alumno (HU7)** | `POST /internal/v1/notifications` | `NotificacionesService` + `RecordatoriosService` | El worker `RecordatoriosService` busca inscripciones activas a eventos que inician en 7 días y envía `{ userId, type: "EVENT_REMINDER", title, message, actionUrl, sourceModule: "events", sourceReference }`. |

---

## 2. Backoffice Administrativo

### Situación actual
Toda la integración con Backoffice Administrativo está implementada y tipada punto a punto en `BackofficeClient` (`apps/api/src/common/backoffice/backoffice.client.ts`), autenticada con el token de servicio M2M de `CoreTokenService` y validada con `@repo/contracts/src/backoffice.schema.ts`. Cuando `BACKOFFICE_BASE_URL` no está configurada, `BackofficeMockController` sirve los contratos localmente.

### Endpoints implementados y consumidos
1. **Listado de Sedes**:
   - `GET /api/v1/backoffice/sedes`
   - Expuesto en nuestro backend en `GET /api/v1/sedes` a través de `SedesController`.
2. **Espacios por Sede**:
   - `GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true`
   - `LocacionesSyncService` sincroniza periódicamente los espacios activos y aptos para eventos de cada sede en la tabla `locaciones`.
3. **Tarifas Vigentes**:
   - `GET /api/v1/backoffice/tarifas/vigente?concepto={concepto}&fecha={YYYY-MM-DD}`
   - Conceptos: `general` $\to$ `EVENTO_INSCRIPCION_GENERAL` y `especial` $\to$ `EVENTO_INSCRIPCION_ESPECIAL`.
   - `TarifasService` mantiene caché en memoria con polling periódico (ADR 0014).
4. **Datos del Usuario Logueado / Consulta de Usuarios**:
   - `GET /api/v1/backoffice/usuarios/{id}`
   - Consumido por `UsuariosService` y expuesto en `GET /api/v1/usuarios/me` (tomando el `sub` del JWT validado por `CoreJwtGuard`) y `GET /api/v1/usuarios/:id`.

---

## 3. Analítica Institucional

### Situación actual
`AnaliticaService` (`apps/api/src/common/analitica/analitica.service.ts`) valida los 3 eventos de dominio con `@repo/contracts/src/analitica.schema.ts`, los envuelve en el sobre estándar de CORE (`coreEventEnvelopeSchema`, `specVersion: "1.0"`) y los publica en `POST /internal/v1/events` con sufijo `.v1` para su distribución por RabbitMQ:

1. **`evento.creado`** (`evento.creado.v1`) — emitido en `EventosService.crear()`.
2. **`inscripcion.registrada`** (`inscripcion.registrada.v1`) — emitido en `InscripcionesService.crear()` con el `usuarioId` y `rol` reales del JWT.
3. **`asistencia.confirmada`** (`asistencia.confirmada.v1`) — emitido en `AsistenciaService.registrar()`.
