# Integraciones con otros módulos

> Documento vivo. Cada fila se actualiza cuando haya novedades de la conversación con el otro grupo. Ver detalle exhaustivo y acuerdos en [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md).

| Con quién | Qué necesitamos | Estado | Notas |
|---|---|---|---|
| CORE | Validar token de autenticación (JWT RS256) y permisos RBAC (`campus-events:manage`) en cada request | Implementado (`CoreJwtGuard` + `CoreJwksService`) | Valida firma RS256 y vencimiento contra `GET /.well-known/jwks.json`, verifica `X-Core-Signature` cuando `CORE_GATEWAY_SECRET` está activo, reconstruye identidad/permisos y hace upsert en la tabla local `usuarios` |
| CORE | Token de servicio M2M (`POST /internal/v1/service-auth/token`) | Implementado (`CoreTokenService`) | Obtiene y cachea el JWT M2M de `events-service` (~15 min) para llamadas hacia CORE y Backoffice |
| CORE | Descuento, reversa, conciliación y consulta de saldo institucional | Implementado (`SaldoService` + `GET /api/v1/usuarios/me/saldo`) | Consume `GET /api/v1/wallets/me`, `POST /internal/v1/wallets/{userId}/debits` (con `Idempotency-Key` UUID), `POST /internal/v1/wallet-transactions/{transactionId}/reversals` (compensación ante fallo de persistencia) y `GET /internal/v1/wallet-transactions/by-reference` |
| CORE | Acreditación/recarga de saldo institucional | **No aplica** | Confirmado por arquitectura general: CORE gestiona saldos y recargas. Eventos sólo consulta saldo, pide débito y revierte en caso de fallo técnico |
| CORE | Envío de notificaciones y recordatorio de evento (HU7 — `evento.recordatorio`) | Implementado (`NotificacionesService` + `RecordatoriosService`) | Worker busca inscripciones activas a eventos que inician en 7 días y publica en `POST /internal/v1/notifications` y `POST /internal/v1/events` (`evento.recordatorio.v1`) |
| Analítica Institucional | Eventos emitidos (`evento.creado`, `inscripcion.registrada`, `asistencia.confirmada`) | Implementado (`AnaliticaService` vía bus de CORE) | Valida los 3 eventos con Zod (`@repo/contracts`) y los publica en `POST /internal/v1/events` con el sobre estándar v1 (`specVersion: "1.0"`). CORE los reparte por RabbitMQ |
| Portal del Estudiante / Portal del Docente | Formato del link/notificación que reciben para llegar al detalle del evento | Implementado vía CORE | Los portales consumen `/api/v1/eventos/{id}` y reciben el recordatorio con link directo en la campanita de CORE |
| Backoffice Administrativo | Listado de sedes (`GET /api/v1/backoffice/sedes`) | Implementado (`BackofficeClient` + `SedesController`) | Consulta directa con token de servicio M2M de CORE. Expuesto en `GET /api/v1/sedes` |
| Backoffice Administrativo | Espacios por sede (`GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true`) | Implementado (`LocacionesSyncService`) | Sincronización periódica del catálogo local en la tabla `locaciones` |
| Backoffice Administrativo | Tarifa vigente por concepto (`GET /api/v1/backoffice/tarifas/vigente?concepto=&fecha=`) | Implementado (`TarifasService`) | Caché en memoria con polling periódico (ADR 0014) |
| Backoffice Administrativo | Datos de usuario logueado (`GET /api/v1/backoffice/usuarios/{id}`) | Implementado (`UsuariosService` + `UsuariosController`) | Expuesto en `GET /api/v1/usuarios/me` (usando el `sub` del JWT autenticado) y `GET /api/v1/usuarios/:id` |

## Coordinación entre los 10 grupos

Reglas fijadas por la coordinación de cátedra:
1. **Pasa sí o sí por CORE:** Identidad (login/tokens RS256 validados con JWKS), tráfico del usuario (gateway `/api/v1/{modulo}/...`), billetera/saldos, avisos entre módulos (repartidos por RabbitMQ vía `POST /internal/v1/events`) y notificaciones al alumno (`POST /internal/v1/notifications`).
2. **Directo entre módulos:** Pedidos sincrónicos de datos a su dueño (Eventos a Backoffice por sedes, espacios, tarifas o usuarios). Se envían con token de servicio de CORE (cacheado por ~15 min) y el receptor valida con el JWKS de CORE. Ver [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md) para el detalle operativo.
