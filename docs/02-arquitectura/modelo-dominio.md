# Modelo de dominio

> Documento vivo, **todavía no cerrado**. Esto es un punto de partida a validar/completar como equipo (es justamente la historia "Definir modelo de dominio" del backlog). Actualizar los campos marcados como TBD antes de empezar a modelar el schema en Drizzle.

## Entidades

### Usuario (caché local de CORE)
- `id` — mismo id que emite CORE en el JWT (no autogenerado acá).
- `nombre`
- `email`
- `rol` (`estudiante` | `docente` | `administrativo`)
- `actualizadoEn` — timestamp del último upsert.

No es una tabla de auth propia: CORE sigue siendo la fuente de verdad y quien emite el JWT. Se hace `upsert` (por `id`) cada vez que llega un JWT válido, con los datos que trae el token — así `Evento.creadoPor` e `Inscripcion.usuarioId` pueden ser FK a una tabla local en vez de guardar un id crudo sin contexto, sin necesitar un roundtrip a CORE para mostrar nombre/rol en listados. Se completa cuando `common/guards/core-jwt.guard.ts` deje de ser placeholder (ver `integraciones.md`); hasta entonces la tabla existe pero no tiene mecanismo real de upsert.

### Evento
- `id`
- `titulo`
- `descripcion` — obligatoria.
- `locacionId` (FK a Locación)
- `cupoMaximo`
- `fechaInicio`, `fechaFin`
- `esPago` (boolean)
- `precio` — nullable si `esPago = false`
- `creadoPor` (FK a Usuario) — administrativo que lo creó.

Sin estado explícito: ningún HU pide borradores ni cancelación de evento. Que ya pasó se resuelve comparando `fechaFin` contra `now()`, no con un campo aparte. Si aparece la necesidad de borrador/cancelación más adelante, se agrega con su propia migration y ADR.

### Locación
- `id`
- `nombre`
- `sede` (texto, no FK) — catálogo de sedes se maneja en nuestra DB, no vía integración (ver `../01-proyecto/overview.md`). No se modela `Sede` como entidad propia porque no hay HU que la gestione ni atributos más allá del nombre (ver mock `SEDES` en `apps/web/lib/mock/eventos.ts`) — si aparece esa necesidad, se extrae a tabla después.
- `capacidad`

`capacidad` es informativa, no se valida contra `Evento.cupoMaximo` — son cosas independientes. El admin es responsable de no poner un cupo mayor a lo que la locación banca; si se decide validarlo más adelante, es un cambio de regla de negocio, no de schema.

### Inscripcion
- `id`
- `eventoId` (FK)
- `usuarioId` (FK a Usuario — ver caché local de CORE arriba)
- `fechaInscripcion`
- `estado` — TBD: mínimo `inscripto`, ¿hace falta `cancelado`? (No hay HU de cancelación definida todavía, ver `../01-proyecto/backlog.md`).
- `pagoConfirmado` — solo aplica si el evento es pago

### Asistencia
- `id`
- `inscripcionId` (FK)
- `confirmadaEn` (timestamp)
- `metodo` — TBD: depende de qué mecanismo se elija (QR, check-in manual, otro) — historia técnica pendiente.

## Reglas de negocio a validar contra este modelo

- No puede haber dos Eventos con la misma Locación en rango de fechas/horas superpuesto.
- Un mismo `usuarioId` no puede tener dos Inscripciones activas a Eventos con fechas/horas superpuestas.
- Si `Evento.esPago = true`, la Inscripción requiere descuento de saldo institucional (vía CORE) antes de confirmarse.
- No se puede crear una Inscripción si `cantidad de inscriptos >= cupoMaximo`.
- El recordatorio se dispara cuando `fechaInicio - hoy = 7 días` para cada Inscripción activa.

## Pendiente de decidir

- ¿La cancelación de inscripción es un requisito real o quedó afuera del alcance del TP? (El enunciado no la pide explícitamente — no inventar la feature sin confirmarlo como grupo). Bloquea cerrar `Inscripcion.estado`.
- Mecanismo de verificación de asistencia (QR, código en sala, check-in manual) — bloquea `Asistencia.metodo`, historia técnica separada.
