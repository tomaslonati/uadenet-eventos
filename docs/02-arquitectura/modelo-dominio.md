# Modelo de dominio

> Documento vivo, **todavía no cerrado**. Esto es un punto de partida a validar/completar como equipo (es justamente la historia "Definir modelo de dominio" del backlog). Actualizar los campos marcados como TBD antes de empezar a modelar el schema en Drizzle.

## Entidades

### Usuario (caché local de CORE)
- `id` — mismo id que emite CORE en el JWT (no autogenerado acá).
- `nombre`
- `email`
- `rol` (`estudiante` | `docente` | `administrativo`)
- `actualizadoEn` — timestamp del último upsert.

No es una tabla de auth propia: CORE sigue siendo la fuente de verdad y quien emite el JWT. Se hace `upsert` (por `id`) cada vez que llega un JWT válido, con los datos que trae el token — así `Evento.creadoPor` e `Inscripcion.usuarioId` pueden ser FK a una tabla local en vez de guardar un id crudo sin contexto, sin necesitar un roundtrip a CORE para mostrar nombre/rol en listados. El upsert lo hace `common/guards/core-jwt.guard.ts` con cada JWT válido (ver `integraciones.md`).

### Evento
- `id`
- `titulo`
- `descripcion` — obligatoria.
- `locacionId` (FK a Locación)
- `cupoMaximo`
- `fechaInicio`, `fechaFin`
- `esPago` (boolean)
- `categoriaPrecio` — `general` | `especial`, sólo si `esPago = true`. No guardamos un monto acá: se resuelve contra la tarifa vigente de Backoffice al momento de listar/inscribir (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)).
- `creadoPor` (FK a Usuario) — administrativo que lo creó. Es el único que puede editarlo, cancelarlo y tomar su asistencia.
- `estado` — `publicado` (default) | `cancelado`. Baja lógica: el evento cancelado se conserva para el historial de inscriptos y reembolsos, y deja de aparecer en la cartelera.
- `motivoCancelacion`, `canceladoEn` — se completan al cancelar; el motivo se les informa a los inscriptos.
- `reprogramadoEn` — última vez que cambió la fecha o la locación (nunca por editar título, descripción o cupo). Abre la cancelación libre de las inscripciones.

No hay borradores. Que un evento "ya pasó" se resuelve comparando `fechaFin` contra `now()`, no con un campo aparte. La edición y la cancelación están en [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md).

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
- `estado` — `inscripto` | `cancelada`. `cancelada` solo la deja la cancelación del **evento** por su creador, para poder seguir el reembolso. Cuando la persona cancela su propia inscripción (agregada fuera del TP, ver `../01-proyecto/backlog.md`) la fila se borra. Todas las cuentas de cupo, conflicto horario y asistencia consideran solo las `inscripto`.
- `pagoConfirmado` — solo aplica si el evento es pago
- `reembolsadoEn` — nullable. Cuándo CORE confirmó la devolución. En una inscripción **paga** `cancelada`, `null` significa reembolso pendiente: es lo que reintenta el creador desde la pantalla del evento.
- `montoCobrado` — nullable, sólo si el evento es pago. Es el monto que devolvió Backoffice al momento de confirmarse esta inscripción puntual, no una referencia a `Evento.categoriaPrecio` — si la tarifa cambia después, esta inscripción ya tiene su monto fijado (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md)).
- Credencial — no hay una columna aparte: la credencial digital (el QR de "Mis inscripciones") codifica el `id` de la inscripción, que es lo que `Asistencia` valida en la puerta. `codigoCredencial()` en `apps/web/lib/dominio.ts` solo se usa de respaldo si la inscripción todavía no llegó desde la API.

### Asistencia
- `id`
- `inscripcionId` (FK)
- `confirmadaEn` (timestamp)
- `metodo` — `qr` | `manual`. Son los dos que ya cubre el mock de `/asistencia` — se descartó "código en sala" por ser el más débil en seguridad de los tres que se evaluaron (un mismo código sirve para toda la sala).

## Reglas de negocio a validar contra este modelo

- No puede haber dos Eventos con la misma Locación en rango de fechas/horas superpuesto.
- Un mismo `usuarioId` no puede tener dos Inscripciones activas a Eventos con fechas/horas superpuestas.
- Si `Evento.esPago = true`, la Inscripción requiere descuento de saldo institucional (vía CORE) antes de confirmarse.
- No se puede crear una Inscripción si `cantidad de inscriptos >= cupoMaximo`.
- El recordatorio se dispara cuando `fechaInicio - hoy = 7 días` para cada Inscripción activa.
- El monto cobrado en una Inscripción se fija al confirmarse contra la tarifa vigente de Backoffice; no se recalcula si la tarifa cambia después.
- No se puede crear un Evento en una Locación con `aptoEventos = false`.
- Un Evento cancelado no ocupa su Locación: otro evento puede reservar ese horario.
- No se puede inscribir a un Evento cancelado ni registrar asistencia en él.
- Solo el creador edita o cancela un Evento, y solo mientras está `publicado` y no empezó. Cancelar tampoco se puede si ya hay asistencias registradas.
- Editar: el cupo no puede quedar por debajo de los inscriptos; con inscriptos no se cambia `esPago` ni `categoriaPrecio`; un cambio de fecha o locación revalida la reserva de la locación y que ningún inscripto quede con otro evento en el nuevo horario.
- Reprogramar (cambia fecha o locación) avisa a los inscriptos y les deja cancelar la inscripción hasta el inicio del evento, sin el límite de 24 hs.
- Cancelar un Evento da de baja a todos sus inscriptos, devuelve el `montoCobrado` de cada inscripción paga (reversa en CORE) y los avisa. Si un reembolso falla queda pendiente y se reintenta repitiendo la cancelación; nunca se devuelve dos veces el mismo cobro.
- No se puede crear un Evento con una `categoriaPrecio` para la que no haya tarifa vigente en el caché de Backoffice, ni confirmar una Inscripción paga si al momento de cobrar no hay tarifa vigente para la categoría del evento (ver [ADR 0014](../decisions/0014-cache-de-tarifas-por-polling.md)).

## Pendiente de decidir

Nada del modelo en sí. Con Backoffice el path y el shape de locaciones y tarifa ya están confirmados (ver ADR 0013/0014); lo que queda pendiente de ese lado es si van a embeber el nombre de la sede en la respuesta de espacios, y de nuestro lado la frecuencia del polling de tarifas. Lo que sigue sin depender de nosotros: los contratos con CORE (firma del JWT, descuento de saldo, canal de notificaciones) y con Analítica — ver [`integraciones.md`](integraciones.md) y [`flujo-de-datos-integraciones.md`](flujo-de-datos-integraciones.md).

`Inscripcion.estado` y `Asistencia.metodo` estaban marcados como TBD y se cerraron con lo que ya estaba decidido en los mocks de vista (los tres métodos de asistencia) y, para `estado`, con la cancelación del evento (ADR 0015). Si el equipo quiere revisarlos, son un cambio de schema con migration.
