# Flujo de datos — contrato con otros módulos

> Documento vivo. Es la versión navegable y diffeable del entregable "Flujo de Datos" de la 1° Entrega (planilla `Flujo de Datos - Modulo 6 - UADEnet.xlsx`, formato común a los 10 grupos). Si se cambia una estructura acá, se cambia también en la planilla — no se dejan desincronizados.
>
> Complementa a [`flujo-de-datos-negocio.md`](flujo-de-datos-negocio.md), que muestra el **recorrido** (quién hace qué, en qué orden). Este documento define el **contrato**: qué viaja en cada punto de ese recorrido.

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
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/inscripciones`](#post-apiv1inscripciones) |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/inscripciones`](#get-apiv1inscripciones) |
| — (consumo interno) | Entrada | Restful API | [`POST /api/v1/asistencia`](#post-apiv1asistencia) |
| — (consumo interno) | Salida | Restful API | [`GET /api/v1/eventos/{id}/cupo`](#get-apiv1eventosidcupo) |
| CORE | Salida / Entrada | Restful API | [`POST {CORE_BASE_URL}/saldo/descontar`](#core--descuento-de-saldo) |
| CORE | Salida | Message Queue | [`evento.recordatorio`](#core--recordatorio-de-evento) |
| Analítica Institucional | Salida | Message Queue | [`evento.creado`](#analítica--eventoscreado) |
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

`Entrada` · `Restful API` · HU1. Responde `409` si la locación ya tiene un evento solapado en ese rango horario.

```jsonc
// Estructura
{ "titulo": "string", "descripcion": "string", "locacionId": "uuid",
  "cupoMaximo": "number (entero > 0)", "fechaInicio": "datetime ISO 8601",
  "fechaFin": "datetime ISO 8601 (posterior a fechaInicio)", "esPago": "boolean",
  "precio": "number (entero > 0) | null — obligatorio si esPago = true" }

// Ejemplo
{ "titulo": "Charla: Arquitectura de Software",
  "descripcion": "Charla abierta sobre patrones de arquitectura.",
  "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "cupoMaximo": 80,
  "fechaInicio": "2026-10-15T18:00:00-03:00", "fechaFin": "2026-10-15T20:00:00-03:00",
  "esPago": false, "precio": null }
```

### `GET /api/v1/eventos?desde=&hasta=`

`Salida` · `Restful API` · HU2 y calendario de los portales. Ordenado por `fechaInicio` ascendente.

`desde` y `hasta` son ISO 8601 y opcionales; sin ellos devuelve todo. Filtran por **solapamiento**, no por fecha de inicio: un evento que arranca antes de `desde` y termina dentro de la ventana aparece igual.

La locación viene resuelta y el cupo calculado a propósito: los portales piden un mes entero de una vez y no pueden hacer una llamada por evento. `yaInscripto` se calcula contra el usuario del JWT.

```jsonc
// Estructura
[{ "id": "uuid", "titulo": "string", "descripcion": "string", "locacionId": "uuid",
   "cupoMaximo": "number", "fechaInicio": "datetime", "fechaFin": "datetime",
   "esPago": "boolean", "precio": "number | null",
   "creadoPor": "string (id de usuario en CORE)",
   "locacion": { "nombre": "string", "sede": "string" },
   "inscriptos": "number", "disponibles": "number", "yaInscripto": "boolean" }]

// Ejemplo — GET /api/v1/eventos?desde=2026-10-01&hasta=2026-10-31
[{ "id": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
   "titulo": "Charla: Arquitectura de Software",
   "descripcion": "Charla abierta sobre patrones de arquitectura.",
   "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "cupoMaximo": 80,
   "fechaInicio": "2026-10-15T18:00:00-03:00", "fechaFin": "2026-10-15T20:00:00-03:00",
   "esPago": false, "precio": null, "creadoPor": "u-10432",
   "locacion": { "nombre": "Aula Magna", "sede": "Monserrat" },
   "inscriptos": 63, "disponibles": 17, "yaInscripto": false }]
```

Con `disponibles` y `yaInscripto` en la misma respuesta, el consumidor resuelve en una sola llamada el calendario, "a cuáles me puedo inscribir" (`disponibles > 0 && !yaInscripto`) y "a cuáles ya me inscribí" (`yaInscripto`).

### `GET /api/v1/eventos/{id}`

`Salida` · `Restful API` · destino del link que enviamos en el recordatorio. Mismo objeto que el listado, sin array — también con `locacion`, `disponibles` y `yaInscripto`.

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

`Salida` · `Restful API` · catálogo propio. **No** se integra con Backoffice Administrativo — decidido, ver [`integraciones.md`](integraciones.md).

```jsonc
// Estructura
[{ "id": "uuid", "nombre": "string", "sede": "string", "capacidad": "number" }]

// Ejemplo
[{ "id": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47", "nombre": "Aula Magna",
   "sede": "Monserrat", "capacidad": 120 }]
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

### `GET /api/v1/inscripciones`

`Salida` · `Restful API` · HU5. Devuelve las del usuario del JWT. La cancelación de inscripción no está en el alcance del TP (ver [`backlog.md`](../01-proyecto/backlog.md)), por eso `estado` tiene un único valor.

```jsonc
// Estructura
[{ "id": "uuid", "eventoId": "uuid", "usuarioId": "string", "fechaInscripcion": "datetime",
   "estado": "inscripto", "pagoConfirmado": "boolean" }]

// Ejemplo
[{ "id": "5e8d0b31-9c47-4a26-b18f-72e4c0d95a68",
   "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03", "usuarioId": "u-10432",
   "fechaInscripcion": "2026-09-30T14:22:10-03:00", "estado": "inscripto",
   "pagoConfirmado": true }]
```

## Asistencia

### `POST /api/v1/asistencia`

`Entrada` · `Restful API` · HU6. Los tres métodos son los que ya cubre el mock de `/asistencia`. Responde `409` si no existe una inscripción activa para esa `inscripcionId`.

```jsonc
// Estructura
{ "inscripcionId": "uuid", "metodo": "qr | codigo-en-sala | manual" }

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

## Analítica — `evento.creado`

`Salida` · `Message Queue` · alimenta la métrica de frecuencia de eventos.

```jsonc
// Estructura
{ "tipo": "evento.creado", "eventoId": "uuid", "titulo": "string", "locacionId": "uuid",
  "sede": "string", "cupoMaximo": "number", "fechaInicio": "datetime", "fechaFin": "datetime",
  "esPago": "boolean", "precio": "number | null", "emitidoEn": "datetime" }

// Ejemplo
{ "tipo": "evento.creado", "eventoId": "9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03",
  "titulo": "Workshop de Testing", "locacionId": "c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47",
  "sede": "Monserrat", "cupoMaximo": 40, "fechaInicio": "2026-10-22T18:00:00-03:00",
  "fechaFin": "2026-10-22T21:00:00-03:00", "esPago": true, "precio": 4500,
  "emitidoEn": "2026-09-20T11:05:00-03:00" }
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

Todos los endpoints `/api/v1` de este documento están implementados en `apps/api` con tests unitarios. El descuento de saldo de CORE está mockeado con saldo fijo en `common/core/saldo.service.ts`. El recordatorio (HU7) y los tres eventos hacia Analítica **todavía no se emiten**: no hay worker ni publisher, y el canal sigue sin definirse.

## Qué falta confirmar

Las estructuras de arriba son las que implementa nuestro módulo. Lo que todavía no está acordado con el otro grupo — seguimiento en [`integraciones.md`](integraciones.md):

| Punto | De quién depende |
|---|---|
| Mecanismo de firma del JWT (secreto compartido vs JWKS) | CORE |
| Path real y shape de respuesta del descuento de saldo | CORE |
| Canal del recordatorio: cola/topic vs endpoint REST | CORE |
| Los tres eventos que consume Analítica | Analítica Institucional |
