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
- `categoriaPrecio` — `general` | `especial`, sólo si `esPago = true`. No guardamos un monto acá: se resuelve contra la tarifa vigente de Backoffice al momento de listar/inscribir (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)).
- `creadoPor` (FK a Usuario) — administrativo que lo creó.

Sin estado explícito: ningún HU pide borradores ni cancelación de evento. Que ya pasó se resuelve comparando `fechaFin` contra `now()`, no con un campo aparte. Si aparece la necesidad de borrador/cancelación más adelante, se agrega con su propia migration y ADR.

### Locación
- `id`
- `nombre`
- `sede` (texto, no FK) — no se modela `Sede` como entidad propia porque Backoffice tampoco la normaliza como catálogo separado (ver mock `SEDES` en `apps/web/lib/mock/eventos.ts`) — si aparece esa necesidad, se extrae a tabla después.
- `capacidad`
- `aptoEventos` (boolean) — el catálogo completo de locaciones se sincroniza desde Backoffice Administrativo, incluido este flag (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)). No se puede crear un Evento en una locación con `aptoEventos = false`.

`capacidad` es informativa, no se valida contra `Evento.cupoMaximo` — son cosas independientes. El admin es responsable de no poner un cupo mayor a lo que la locación banca; si se decide validarlo más adelante, es un cambio de regla de negocio, no de schema.

### Inscripcion
- `id`
- `eventoId` (FK)
- `usuarioId` (FK a Usuario — ver caché local de CORE arriba)
- `fechaInscripcion`
- `estado` — `inscripto`, único valor. La cancelación de inscripción no está pedida en el TP y quedó explícitamente fuera de alcance (ver `../01-proyecto/backlog.md`); si entra, es una migration nueva y su propio ADR.
- `pagoConfirmado` — solo aplica si el evento es pago
- `montoCobrado` — nullable, sólo si el evento es pago. Es el monto que devolvió Backoffice al momento de confirmarse esta inscripción puntual, no una referencia a `Evento.categoriaPrecio` — si la tarifa cambia después, esta inscripción ya tiene su monto fijado (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)).
- `codigoCredencial` — código que el método `qr` de `Asistencia` valida en la puerta. Hoy sólo existe en el mock de frontend, derivado en `apps/web/lib/dominio.ts` (`codigoCredencial(eventoId, indice)`); cuando `Inscripcion` deje de ser mock, pasa a ser un campo real de esta tabla (generado al confirmarse la inscripción).

### Asistencia
- `id`
- `inscripcionId` (FK)
- `confirmadaEn` (timestamp)
- `metodo` — `qr` | `codigo-en-sala` | `manual`. Son los tres que ya cubre el mock de `/asistencia`; se soportan los tres en vez de elegir uno, porque el mock los muestra como alternativas del mismo flujo.

## Reglas de negocio a validar contra este modelo

- No puede haber dos Eventos con la misma Locación en rango de fechas/horas superpuesto.
- Un mismo `usuarioId` no puede tener dos Inscripciones activas a Eventos con fechas/horas superpuestas.
- Si `Evento.esPago = true`, la Inscripción requiere descuento de saldo institucional (vía CORE) antes de confirmarse.
- No se puede crear una Inscripción si `cantidad de inscriptos >= cupoMaximo`.
- El recordatorio se dispara cuando `fechaInicio - hoy = 7 días` para cada Inscripción activa.
- El monto cobrado en una Inscripción se fija al confirmarse contra la tarifa vigente de Backoffice; no se recalcula si la tarifa cambia después.
- No se puede crear un Evento en una Locación con `aptoEventos = false`.

## Pendiente de decidir

Nada del modelo en sí. Lo que falta no depende de nosotros: los contratos con CORE (firma del JWT, descuento de saldo, canal de notificaciones), con Analítica y con Backoffice Administrativo (path real del catálogo de locaciones y de la tarifa por categoría) — ver [`integraciones.md`](integraciones.md) y [`flujo-de-datos-integraciones.md`](flujo-de-datos-integraciones.md).

`Inscripcion.estado` y `Asistencia.metodo` estaban marcados como TBD y se cerraron con lo que ya estaba decidido en `../01-proyecto/backlog.md` (la cancelación quedó fuera de alcance) y en los mocks de vista (los tres métodos de asistencia). Si el equipo quiere revisarlos, son un cambio de schema con migration.
