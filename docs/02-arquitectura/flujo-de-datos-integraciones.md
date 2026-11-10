# Flujo de datos — contrato con otros módulos

> Documento vivo. Es la versión navegable y diffeable del entregable "Flujo de Datos" de la 1° Entrega (planilla `Flujo de Datos - Modulo 6 - UADEnet.xlsx`, formato común a los 10 grupos). Si se cambia una estructura acá, se cambia también en la planilla — no se dejan desincronizados.
>
> Complementa a [`flujo-de-datos-negocio.md`](flujo-de-datos-negocio.md), que muestra el **recorrido** (quién hace qué, en qué orden). Este documento define el **contrato**: qué viaja en cada punto de ese recorrido.

> **Agregado después de la 1° Entrega** (no está en la planilla entregada, que es una foto de esa fecha): edición, impacto y cancelación de evento, cancelación de inscripción, `estado` en eventos e inscripciones, los avisos de reprogramación y cancelación, y los eventos `evento.modificado` y `evento.cancelado`. Están marcados con *(nuevo)*. Si hace falta una planilla actualizada, la fuente es este documento.

Base de la API: `/api/v1` — prefijo global `api` más versionado por URI (`apps/api/src/main.ts`). Todo request a `/api/v1/**` requiere el JWT de CORE.

`Dirección`: **Entrada** = un módulo externo envía datos a este módulo · **Salida** = este módulo entrega datos a un módulo externo.

## Índice

| Módulo Externo | Dirección | Canal | Identificador |
|---|---|---|---|
| CORE | Entrada | Restful API | [`Authorization: Bearer {JWT}`](#core--autenticación) |
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/eventos`](#post-apiv1eventos) |
| Portales Estudiante/Docente | Salida | Restful API | [`GET /api/v1/eventos?desde=&hasta=`](#get-apiv1eventosdesdehasta) |
| Portales Estudiante/Docente | Salida | Restful API | [`GET /api/v1/eventos/{id}`](#get-apiv1eventosid) |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/locaciones`](#get-apiv1locaciones) |
| — (consumo interno) | Entrada | Restful API | [`PATCH /api/v1/eventos/{id}`](#patch-apiv1eventosid) *(nuevo)* |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/eventos/{id}/impacto`](#get-apiv1eventosidimpacto) *(nuevo)* |
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/eventos/{id}/cancelacion`](#post-apiv1eventosidcancelacion) *(nuevo)* |
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/inscripciones`](#post-apiv1inscripciones) |
| — (consumo interno) | Entrada | Restful API | [`DELETE /api/v1/inscripciones/{id}`](#delete-apiv1inscripcionesid) *(nuevo)* |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/inscripciones`](#get-apiv1inscripciones) |
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/asistencia`](#post-apiv1asistencia) |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/eventos/{id}/cupo`](#get-apiv1eventosidcupo) |
| CORE | Salida / Entrada | Restful API | [`POST {CORE_BASE_URL}/saldo/descontar`](#core--descuento-de-saldo) |
| Backoffice Administrativo | Entrada | Restful API | [`GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true`](#backoffice--espacios-por-sede) |
| Backoffice Administrativo | Entrada | Restful API | [`GET /api/v1/backoffice/tarifas/vigente?concepto=&fecha=`](#backoffice--tarifa-vigente) |
| CORE | Salida | Message Queue | [`evento.recordatorio`](#core--recordatorio-de-evento) |
| CORE | Salida | Restful API | [`POST /internal/v1/notifications` — reprogramado / cancelado](#core--aviso-de-reprogramación-o-cancelación) *(nuevo)* |
| Analítica Institucional | Salida | Message Queue | [`evento.creado`](#analítica--eventoscreado) |
| Analítica Institucional | Salida | Message Queue | [`evento.modificado`](#analítica--eventomodificado) *(nuevo)* |
| Analítica Institucional | Salida | Message Queue | [`evento.cancelado`](#analítica--eventocancelado) *(nuevo)* |
| Analítica Institucional | Salida | Message Queue | [`inscripcion.registrada`](#analítica--inscripcionregistrada) |
| Analítica Institucional | Salida | Message Queue | [`asistencia.confirmada`](#analítica--asistenciaconfirmada) |

**`— (consumo interno)`** = endpoint que hoy consume solo nuestro propio frontend (`apps/web`). Queda publicado igual, por si otro módulo lo necesita.

---

## CORE — autenticación

`Entrada` · `Restful API` · header `Authorization: Bearer {JWT}` en todo request a `/api/v1/**`

Claims que consume `common/guards/core-jwt.guard.ts`. El usuario se cachea localmente por `sub` (ver [`modelo-dominio.md`](modelo-dominio.md)); CORE sigue siendo la fuente de verdad.

```jsonc
// Estructura
{ "sub": "string (id de usuario en CORE)", "nombre": "string", "email": "string",
  "rol": "estudiante | docente | administrativo", "exp": "number (epoch en segundos)" }

// Ejemplo
{ "sub": "u-10432", "nombre": "María López", "email": "mlopez@uade.edu.ar",
  "rol": "administrativo", "exp": 1789084800 }
```

## Eventos

### `POST /api/v1/eventos`

`Entrada` · `Restful API` · HU1. Responde `409` si la locación ya tiene un evento solapado en ese rango horario, o si la locación no está `aptoEventos`.

```jsonc
// Estructura
{ "titulo": "string", "descripcion": "string", "locacionId": "uuid",
  "cupoMaximo": "number (entero > 0)", "fechaInicio": "datetime ISO 8601",
  "fechaFin": "datetime ISO 8601 (posterior a fechaInicio)", "esPago": "boolean",
  "categoriaPrecio": "general | especial | null — obligatorio si esPago = true" }

// Ejemplo
{ "titulo": "Charla: Arquitectura de Software",
  "descripcion": "Charla abierta sobre patrones de arquitectura.",
  "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "cupoMaximo": 80,
  "fechaInicio": "2026-10-15T18:00:00-03:00", "fechaFin": "2026-10-15T20:00:00-03:00",
  "esPago": false, "categoriaPrecio": null }
```

### `GET /api/v1/eventos?desde=&hasta=`

`Salida` · `Restful API` · HU2 y calendario de los portales. Ordenado por `fechaInicio` ascendente.

`desde` y `hasta` son ISO 8601 y opcionales; sin ellos devuelve todo. Filtran por **solapamiento**, no por fecha de inicio: un evento que arranca antes de `desde` y termina dentro de la ventana aparece igual.

La locación viene resuelta y el cupo calculado a propósito: los portales piden un mes entero de una vez y no pueden hacer una llamada por evento. `yaInscripto` se calcula contra el usuario del JWT. `precio` es un valor **resuelto** en el momento (no una columna): sale de consultar la tarifa vigente de Backoffice para `categoriaPrecio` — ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md).

```jsonc
// Estructura
[{ "id": "uuid", "titulo": "string", "descripcion": "string", "locacionId": "uuid",
   "cupoMaximo": "number", "fechaInicio": "datetime", "fechaFin": "datetime",
   "esPago": "boolean", "categoriaPrecio": "general | especial | null",
   "creadoPor": "string (id de usuario en CORE)",
   "estado": "publicado | cancelado", "motivoCancelacion": "string | null",
   "reprogramadoEn": "datetime | null — si cambió la fecha o la locación",
   "locacion": { "nombre": "string", "sede": "string" },
   "inscriptos": "number", "disponibles": "number", "yaInscripto": "boolean",
   "precio": "number | null — resuelto contra la tarifa vigente de Backoffice" }]

// Ejemplo — GET /api/v1/eventos?desde=2026-10-01&hasta=2026-10-31
[{ "id": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
   "titulo": "Charla: Arquitectura de Software",
   "descripcion": "Charla abierta sobre patrones de arquitectura.",
   "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "cupoMaximo": 80,
   "fechaInicio": "2026-10-15T18:00:00-03:00", "fechaFin": "2026-10-15T20:00:00-03:00",
   "esPago": false, "categoriaPrecio": null, "creadoPor": "u-10432",
   "estado": "publicado", "motivoCancelacion": null, "reprogramadoEn": null,
   "locacion": { "nombre": "Aula Magna", "sede": "Monserrat" },
   "inscriptos": 63, "disponibles": 17, "yaInscripto": false, "precio": null }]
```

Los eventos `cancelado` también se devuelven (quien estaba inscripto necesita ver qué pasó); el cupo y `yaInscripto` cuentan solo inscripciones `inscripto`, así que un evento cancelado figura con 0 inscriptos. La cartelera de `apps/web` los oculta.

Con `disponibles` y `yaInscripto` en la misma respuesta, el consumidor resuelve en una sola llamada el calendario, "a cuáles me puedo inscribir" (`disponibles > 0 && !yaInscripto`) y "a cuáles ya me inscribí" (`yaInscripto`).

### `GET /api/v1/eventos/{id}`

`Salida` · `Restful API` · destino del link que enviamos en el recordatorio. Mismo objeto que el listado, sin array — también con `locacion`, `disponibles` y `yaInscripto`.

### `PATCH /api/v1/eventos/{id}`

`Entrada` · `Restful API` · *(nuevo)* [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md). Solo el creador; todos los campos son opcionales y solo se tocan los que viajan. Respuestas: `403` si no es el creador, `409` si el evento está cancelado o ya empezó, si el cupo queda por debajo de los inscriptos, si se cambia `esPago`/`categoriaPrecio` habiendo inscriptos, si la locación ya tiene otro evento en el nuevo horario, o si algún inscripto quedaría con otro evento en ese horario.

Si cambia `fechaInicio`, `fechaFin` o `locacionId`, el evento queda marcado `reprogramadoEn`, se avisa a cada inscripto (ver [aviso](#core--aviso-de-reprogramación-o-cancelación)) y se emite [`evento.modificado`](#analítica--eventomodificado).

```jsonc
// Estructura — cualquier subconjunto de los campos de POST /eventos (al menos uno)
{ "titulo": "string", "descripcion": "string", "locacionId": "uuid", "cupoMaximo": "number",
  "fechaInicio": "datetime", "fechaFin": "datetime", "esPago": "boolean",
  "categoriaPrecio": "general | especial | null" }

// Respuesta
{ "evento": { /* el evento actualizado, sin locacion ni cupo calculado */ },
  "notificados": "number — inscriptos a los que se les avisó (0 si el cambio no es de fecha ni de lugar)" }

// Ejemplo — mover la fecha
{ "fechaInicio": "2026-10-16T18:00:00-03:00", "fechaFin": "2026-10-16T20:00:00-03:00" }
```

### `GET /api/v1/eventos/{id}/impacto`

`Salida` · `Restful API` · *(nuevo)* Solo el creador. Lo que mueve cancelar el evento; es lo que muestra la confirmación antes de hacerlo.

```jsonc
// Estructura
{ "eventoId": "uuid", "inscriptos": "number", "inscriptosPagos": "number",
  "montoAReembolsar": "number — suma de montoCobrado de las inscripciones pagas activas",
  "reembolsosPendientes": "number — de una cancelación anterior que CORE no confirmó",
  "asistenciasRegistradas": "number" }

// Ejemplo
{ "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "inscriptos": 12, "inscriptosPagos": 10,
  "montoAReembolsar": 55000, "reembolsosPendientes": 0, "asistenciasRegistradas": 0 }
```

### `POST /api/v1/eventos/{id}/cancelacion`

`Entrada` · `Restful API` · *(nuevo)* [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md). Solo el creador. Responde `200` (no `201`: es idempotente), `400` si falta el motivo, `403` si no es el creador, `409` si el evento ya empezó o ya tiene asistencias registradas.

Marca el evento `cancelado`, da de baja las inscripciones (`cancelada`), devuelve cada pago con una reversa en CORE, avisa a cada inscripto y emite [`evento.cancelado`](#analítica--eventocancelado). **Repetirla** no vuelve a cambiar el evento ni a avisar: solo reintenta los reembolsos pendientes.

```jsonc
// Estructura
{ "motivo": "string (1–500 caracteres) — se le informa a los inscriptos" }

// Respuesta
{ "eventoId": "uuid", "inscriptosAfectados": "number", "reembolsados": "number",
  "reembolsosPendientes": "number — pagos que CORE no confirmó; repetir la llamada los reintenta",
  "montoReembolsado": "number", "notificados": "number — avisos nuevos en esta llamada" }

// Ejemplo
{ "motivo": "Se suspende por ausencia del disertante" }
// → { "eventoId": "9f2b7c14-…", "inscriptosAfectados": 12, "reembolsados": 10,
//     "reembolsosPendientes": 0, "montoReembolsado": 55000, "notificados": 12 }
```

### `GET /api/v1/eventos/{id}/cupo`

`Salida` · `Restful API` · HU8.

```jsonc
// Estructura
{ "eventoId": "uuid", "cupoMaximo": "number", "inscriptos": "number", "disponibles": "number" }

// Ejemplo
{ "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "cupoMaximo": 80,
  "inscriptos": 63, "disponibles": 17 }
```

### `GET /api/v1/locaciones`

`Salida` · `Restful API` · catálogo sincronizado desde Backoffice Administrativo (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)) — lo que exponemos acá es nuestra copia local, no una llamada directa a Backoffice por request.

Se arma consultando `GET /api/v1/backoffice/sedes` (para tener el listado de sedes) y, por cada una, `GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true` (ver [más abajo](#backoffice--espacios-por-sede)) — Backoffice no tiene un listado global. El nombre de la sede se resuelve con esa primera llamada; le pedimos a Backoffice que lo embeba directo en la respuesta de espacios para no tener que cruzar las dos llamadas, pendiente de que lo confirmen.

```jsonc
// Estructura
[{ "id": "uuid", "nombre": "string", "sede": "string", "capacidad": "number",
   "aptoEventos": "boolean" }]

// Ejemplo
[{ "id": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "nombre": "Aula Magna",
   "sede": "Monserrat", "capacidad": 120, "aptoEventos": true }]
```

## Inscripciones

### `POST /api/v1/inscripciones`

`Entrada` · `Restful API` · HU3 y HU4. El usuario se toma del JWT, no viaja en el body. Responde `409` si no hay cupo, si el usuario ya tiene una inscripción superpuesta, o si el saldo es insuficiente.

```jsonc
// Estructura
{ "eventoId": "uuid" }

// Ejemplo
{ "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03" }
```

### `DELETE /api/v1/inscripciones/{id}`

`Entrada` · `Restful API` · *(nuevo)* Cancelación de la propia inscripción (agregada fuera del TP, ver [`backlog.md`](../01-proyecto/backlog.md)). Hasta 24 hs antes del inicio —o hasta el inicio, si el evento se reprogramó— y mientras no haya asistencia registrada. Si fue paga, devuelve el monto con una reversa en CORE. Responde `404` si no es del usuario del JWT y `409` si pasó el plazo, si hay asistencia, si CORE no pudo devolver el saldo (la inscripción sigue activa) o si ya cayó por la cancelación del evento.

```jsonc
// Respuesta
{ "inscripcionId": "uuid", "montoReembolsado": "number | null — null si era gratuita" }
```

### `GET /api/v1/inscripciones`

`Salida` · `Restful API` · HU5. Devuelve las del usuario del JWT, incluidas las `cancelada` por cancelación del evento (la persona necesita ver el estado de su reembolso). Cuando ella misma cancela, la inscripción se borra y no figura.

```jsonc
// Estructura
[{ "id": "uuid", "eventoId": "uuid", "usuarioId": "string", "fechaInscripcion": "datetime",
   "estado": "inscripto | cancelada", "pagoConfirmado": "boolean",
   "montoCobrado": "number | null — congelado al confirmarse, no se recalcula si cambia la tarifa",
   "reembolsadoEn": "datetime | null — en una paga cancelada, null = reembolso pendiente" }]

// Ejemplo
[{ "id": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
   "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "usuarioId": "u-10432",
   "fechaInscripcion": "2026-09-30T14:22:10-03:00", "estado": "inscripto",
   "pagoConfirmado": true, "montoCobrado": 12500, "reembolsadoEn": null }]
```

## Asistencia

### `POST /api/v1/asistencia`

`Entrada` · `Restful API` · HU6. Los dos métodos son los que ya cubre el mock de `/asistencia` (QR y manual — se descartó "código en sala" por ser el más débil en seguridad de los tres que se evaluaron). Responde `409` si no existe una inscripción activa para esa `inscripcionId` o si el evento fue cancelado.

```jsonc
// Estructura
{ "inscripcionId": "uuid", "metodo": "qr | manual" }

// Ejemplo
{ "inscripcionId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68", "metodo": "qr" }
```

## CORE — descuento de saldo

`Salida` (request) y `Entrada` (respuesta) · `Restful API` · `POST {CORE_BASE_URL}/saldo/descontar` · HU4.

Se llama **antes** de persistir la inscripción. Si el descuento falla, la inscripción no se crea y devolvemos `409` al cliente con el motivo.

```jsonc
// Estructura — request
{ "usuarioId": "string", "monto": "number (entero, en pesos)", "concepto": "string",
  "referenciaId": "uuid (id de la inscripción)" }

// Ejemplo — request
{ "usuarioId": "u-10432", "monto": 4500,
  "concepto": "Inscripción a evento: Workshop de Testing",
  "referenciaId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68" }

// Estructura — respuesta
{ "aprobado": "boolean", "saldoRestante": "number", "motivo": "string | null" }

// Ejemplo — respuesta
{ "aprobado": false, "saldoRestante": 1200, "motivo": "SALDO_INSUFICIENTE" }
```

## Backoffice — espacios por sede

`Entrada` · `Restful API` · `GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true` · confirmado por Backoffice, ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md).

Se pide **por sede** — Backoffice no tiene un endpoint de listado global, así que armar nuestra copia local (`GET /api/v1/locaciones`) implica primero listar sedes (`GET /api/v1/backoffice/sedes`) y después pedir los espacios de cada una. La sede llega como `sedeId` (uuid), no como nombre: le pedimos a Backoffice que lo embeba en esta misma respuesta en vez de cruzarlo a mano con el listado de sedes — mientras no lo confirmen, seguimos resolviéndolo con la llamada aparte.

```jsonc
// Estructura
{ "id": "uuid", "sedeId": "uuid", "codigo": "string", "nombre": "string",
  "tipo": "string (ej. SALA_EVENTOS)", "capacidad": "number", "aptoEventos": "boolean",
  "estado": "string (ej. ACTIVO)" }

// Ejemplo
{ "id": "e4f1a2b3-...", "sedeId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "codigo": "A-305",
  "nombre": "Auditorio Principal", "tipo": "SALA_EVENTOS", "capacidad": 200,
  "aptoEventos": true, "estado": "ACTIVO" }
```

## Backoffice — tarifa vigente

`Entrada` · `Restful API` · `GET /api/v1/backoffice/tarifas/vigente?concepto=EVENTO_INSCRIPCION_GENERAL|EVENTO_INSCRIPCION_ESPECIAL&fecha=` · HU4, confirmado por Backoffice, ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md) y [ADR 0014](../decisions/0014-cache-de-tarifas-por-polling.md).

Backoffice pide resolver la tarifa **al momento del cobro**, no al crear el evento, para tomar siempre la versión vigente. Para no depender de una llamada síncrona en cada inscripción, esto se implementa con un caché local en `tarifas.service.ts` que se refresca con polling periódico no agresivo (frecuencia a definir — ver ADR 0014); "al momento del cobro" lee ese caché ya actualizado, no dispara una llamada nueva. Devuelve `404` si no hay ninguna versión vigente para esa fecha/concepto — en ese caso **no se permite crear el evento** con esa categoría **ni confirmar la inscripción**.

```jsonc
// Estructura
{ "concepto": "EVENTO_INSCRIPCION_GENERAL | EVENTO_INSCRIPCION_ESPECIAL",
  "sede": "string | null", "ambitoResuelto": "string (ej. GLOBAL)",
  "monto": "number (decimal)", "moneda": "string (ej. ARS)",
  "unidad": "string (ej. MONTO_FIJO)",
  "vigencia": { "desde": "date", "hasta": "date | null" }, "tarifaId": "uuid" }

// Ejemplo
{ "concepto": "EVENTO_INSCRIPCION_GENERAL", "sede": null, "ambitoResuelto": "GLOBAL",
  "monto": 1800.00, "moneda": "ARS", "unidad": "MONTO_FIJO",
  "vigencia": { "desde": "2026-10-01", "hasta": null },
  "tarifaId": "8f1e2d3c-4b5a-6789-0abc-def123456789" }
```

## CORE — recordatorio de evento

`Salida` · `Message Queue` · `evento.recordatorio` hacia la cola de notificaciones de CORE · HU7.

Lo publica el worker diario cuando `fechaInicio - hoy = 7 días`, una vez por inscripción activa.

```jsonc
// Estructura
{ "tipo": "evento.recordatorio", "usuarioId": "string", "eventoId": "uuid",
  "titulo": "string", "fechaInicio": "datetime", "locacion": "string",
  "url": "string (link al detalle del evento)" }

// Ejemplo
{ "tipo": "evento.recordatorio", "usuarioId": "u-10432",
  "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "titulo": "Workshop de Testing",
  "fechaInicio": "2026-10-22T18:00:00-03:00", "locacion": "Aula Magna — Monserrat",
  "url": "https://uadenet-eventos.vercel.app/eventos/9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03" }
```

## CORE — aviso de reprogramación o cancelación

`Salida` · `Restful API` · *(nuevo)* una notificación por inscripto hacia `POST /internal/v1/notifications` de CORE, la misma vía que el recordatorio. Si el aviso falla, el cambio ya hecho sobre el evento no se deshace.

**Los tipos `EVENT_RESCHEDULED` y `EVENT_CANCELLED` los propone este módulo y todavía no están confirmados por CORE**: contra el CORE simulado de `apps/api` funcionan; contra el real, si CORE no los acepta, el aviso no se entrega (se registra un warning) pero la operación termina bien. `sourceReference` es único por cambio (`evento/{id}/cancelado`, `evento/{id}/reprogramado/{timestamp}`): CORE deduplica por ahí y un evento puede reprogramarse más de una vez.

```jsonc
// Estructura
{ "userId": "string", "type": "EVENT_RESCHEDULED | EVENT_CANCELLED", "title": "string",
  "message": "string — el nuevo horario y lugar, o el motivo y el estado del reembolso",
  "actionUrl": "string (link al detalle del evento)",
  "sourceModule": "events", "sourceReference": "string" }

// Ejemplo — cancelación con reembolso acreditado
{ "userId": "u-10432", "type": "EVENT_CANCELLED", "title": "Se canceló un evento",
  "message": "Se canceló «Workshop de Testing». Motivo: Se suspende por lluvia. Te devolvimos $5.500 a tu cuenta institucional.",
  "actionUrl": "https://uadenet-eventos.vercel.app/eventos/9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
  "sourceModule": "events", "sourceReference": "evento/9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03/cancelado" }
```

## Analítica — `evento.creado`

`Salida` · `Message Queue` · alimenta la métrica de frecuencia de eventos.

```jsonc
// Estructura
{ "tipo": "evento.creado", "eventoId": "uuid", "titulo": "string", "locacionId": "uuid",
  "sede": "string", "cupoMaximo": "number", "fechaInicio": "datetime", "fechaFin": "datetime",
  "esPago": "boolean", "categoriaPrecio": "general | especial | null", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "evento.creado", "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
  "titulo": "Workshop de Testing", "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47",
  "sede": "Monserrat", "cupoMaximo": 40, "fechaInicio": "2026-10-22T18:00:00-03:00",
  "fechaFin": "2026-10-22T21:00:00-03:00", "esPago": true, "categoriaPrecio": "especial",
  "emitidoEn": "2026-09-20T11:05:00-03:00" }
```

## Analítica — `evento.modificado`

`Salida` · `Message Queue` · *(nuevo, pendiente de que Analítica lo confirme)* se emite al cambiar fecha, horario o locación, o el cupo. Mantiene al día la métrica de frecuencia y concurrencia, que de otro modo se quedaría con los datos de `evento.creado`.

```jsonc
// Estructura
{ "tipo": "evento.modificado", "eventoId": "uuid", "locacionId": "uuid", "sede": "string",
  "cupoMaximo": "number", "fechaInicio": "datetime", "fechaFin": "datetime",
  "reprogramado": "boolean — true si cambió fecha o locación",
  "inscriptosNotificados": "number", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "evento.modificado", "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
  "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "sede": "Monserrat", "cupoMaximo": 40,
  "fechaInicio": "2026-10-23T18:00:00-03:00", "fechaFin": "2026-10-23T21:00:00-03:00",
  "reprogramado": true, "inscriptosNotificados": 12, "emitidoEn": "2026-10-01T11:05:00-03:00" }
```

## Analítica — `evento.cancelado`

`Salida` · `Message Queue` · *(nuevo, pendiente de que Analítica lo confirme)* se emite una sola vez, cuando el evento pasa a `cancelado` (repetir la cancelación no lo vuelve a emitir). Permite descontar el evento de las métricas de frecuencia y presentismo.

```jsonc
// Estructura
{ "tipo": "evento.cancelado", "eventoId": "uuid", "motivo": "string",
  "inscriptosAfectados": "number", "montoReembolsado": "number", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "evento.cancelado", "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
  "motivo": "Se suspende por lluvia", "inscriptosAfectados": 12, "montoReembolsado": 55000,
  "emitidoEn": "2026-10-01T11:05:00-03:00" }
```

## Analítica — `inscripcion.registrada`

`Salida` · `Message Queue` · alimenta la métrica de concurrencia.

```jsonc
// Estructura
{ "tipo": "inscripcion.registrada", "inscripcionId": "uuid", "eventoId": "uuid",
  "usuarioId": "string", "rol": "estudiante | docente | administrativo",
  "pagoConfirmado": "boolean", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "inscripcion.registrada", "inscripcionId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
  "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "usuarioId": "u-10432",
  "rol": "estudiante", "pagoConfirmado": true, "emitidoEn": "2026-09-30T14:22:10-03:00" }
```

## Analítica — `asistencia.confirmada`

`Salida` · `Message Queue` · alimenta la métrica de presentismo.

```jsonc
// Estructura
{ "tipo": "asistencia.confirmada", "inscripcionId": "uuid", "eventoId": "uuid",
  "usuarioId": "string", "confirmadaEn": "datetime", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "asistencia.confirmada", "inscripcionId": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
  "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "usuarioId": "u-10432",
  "confirmadaEn": "2026-10-22T18:07:44-03:00", "emitidoEn": "2026-10-22T18:07:45-03:00" }
```

---

## Estado de implementación

Todos los endpoints `/api/v1` de este documento están implementados en `apps/api`, y cada módulo (`eventos`, `inscripciones`, `asistencia`, `locaciones`, `usuarios`) tiene tests unitarios de sus services y controllers.

- **Backoffice Administrativo**: implementado contra los endpoints (`/api/v1/backoffice/sedes`, `/sedes/{sedeId}/espacios?aptoEventos=true`, `/tarifas/vigente?concepto=&fecha=`, `/usuarios/{id}`) vía `BackofficeClient`, con contratos Zod en `@repo/contracts`, sincronización en `LocacionesSyncService` y caché con polling en `TarifasService` (ADR 0014).
- **Analítica Institucional**: los 5 eventos (`evento.creado`, `evento.modificado`, `evento.cancelado`, `inscripcion.registrada`, `asistencia.confirmada`) se validan con Zod y se publican hacia el bus de CORE (`POST /internal/v1/events`) a través de `AnaliticaService`.
- **CORE (Autenticación, Billetera, Bus de Eventos y Notificaciones)**: implementado en `CoreJwtGuard` + `CoreJwksService` (validación RS256 contra `/.well-known/jwks.json`, RBAC `campus-events:manage` y upsert en tabla `usuarios`), `CoreTokenService` (`POST /internal/v1/service-auth/token`), `SaldoService` (`GET /api/v1/wallets/me`, `POST /internal/v1/wallets/{userId}/debits`, `POST /internal/v1/wallet-transactions/{transactionId}/reversals`, `GET /internal/v1/wallet-transactions/by-reference`) y `NotificacionesService` + `RecordatoriosService` (HU7 y avisos de reprogramación/cancelación — `POST /internal/v1/notifications`).

Ver desglose exhaustivo y acuerdos pendientes en [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md).

## Puntos de integración con otros módulos

Siguiendo las directivas generales de cátedra (Gonza UADE):
- **Tráfico y autenticación:** El tráfico del usuario pasa por CORE (`/api/v1/{modulo}/...`). La firma del JWT se valida localmente mediante el **JWKS de CORE**.
- **Llamadas directas entre módulos:** Eventos puede consultar directo a Backoffice (sedes, espacios, tarifas, usuarios) enviando un **token de servicio** emitido por CORE (`clientId`/`secret`, cacheado 15 min), el cual Backoffice valida contra el JWKS de CORE.
- **Eventos y Notificaciones:** Todo aviso entre módulos pasa por CORE, que los distribuye por **RabbitMQ** (ej. hacia Analítica). La campanita del portal la gestiona CORE.

| Punto | Estado |
|---|---|
| Firma JWT de CORE vía JWKS | Confirmado por cátedra (falta URL de JWKS en dev) |
| Token de servicio para llamadas a Backoffice | Confirmado por cátedra |
| Distribución de eventos a Analítica por RabbitMQ | Confirmado: Eventos entrega a CORE y CORE distribuye |
| Canal de recordatorio (`evento.recordatorio`) | Confirmado: se entrega a CORE para la campanita del portal |
| Tipos `EVENT_RESCHEDULED` / `EVENT_CANCELLED` y eventos `evento.modificado` / `evento.cancelado` | Propuestos por este módulo, sin confirmar con CORE ni Analítica |
| Despliegue de ambiente compartido (`BACKOFFICE_BASE_URL` y CORE) | Pendiente de deploy de los otros equipos | 
