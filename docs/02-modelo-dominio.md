# 02 — Modelo de dominio

> Documento vivo, **todavía no cerrado**. Esto es un punto de partida a validar/completar como equipo (es justamente la historia "Definir modelo de dominio" del backlog). Actualizar los campos marcados como TBD antes de empezar a modelar el schema en Drizzle.

## Entidades

### Evento
- `id`
- `titulo`
- `descripcion` — TBD: ¿obligatoria?
- `locacionId` (FK a Locación)
- `cupoMaximo`
- `fechaInicio`, `fechaFin`
- `esPago` (boolean)
- `precio` — nullable si `esPago = false`
- `creadoPor` — referencia al administrativo (usuario de CORE)
- `estado` — TBD: ¿hace falta un estado (borrador/publicado/cancelado) o alcanza con existir = publicado?

### Locación
- `id`
- `nombre`
- `sedeId` — TBD: ¿lo gestiona Backoffice Administrativo o lo modelamos nosotros? (Definido: catálogo de sedes se maneja directo en nuestra DB, no vía integración — ver ADR y `00-overview.md`).
- `capacidad` — TBD: ¿se usa para validar contra el cupo del evento, o son cosas independientes?

### Inscripcion
- `id`
- `eventoId` (FK)
- `usuarioId` (referencia externa — id de usuario de CORE, no una tabla propia de usuarios)
- `fechaInscripcion`
- `estado` — TBD: mínimo `inscripto`, ¿hace falta `cancelado`? (No hay HU de cancelación definida todavía, ver `03-backlog.md`).
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

- ¿`usuarioId` guarda el id crudo que viene del JWT de CORE, o cacheamos algún dato (nombre, email) localmente para no depender de un roundtrip extra? Afecta el schema de Drizzle.
- ¿Hace falta un estado explícito en `Evento` o alcanza con `fechaFin < now()` para saber si ya pasó?
- ¿La cancelación de inscripción es un requisito real o quedó afuera del alcance del TP? (El enunciado no la pide explícitamente — no inventar la feature sin confirmarlo como grupo).
