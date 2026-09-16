# ADR 0013 — Backoffice resuelve tarifa por categoría y catálogo de locaciones (revierte ADR 0012)

**Contexto:** Intercambio de preguntas con el Grupo 8 (Backoffice Administrativo) sobre parametrización tarifaria y catálogo de locaciones. Sus respuestas oficiales cambian dos supuestos con los que veníamos trabajando: el precio de inscripción no es libre por evento, y el catálogo de locaciones sí lo gestiona Backoffice.

**Opciones consideradas:**
1. Mantener ADR 0012 (locación como campo propio) y un precio libre por evento — statu quo.
2. Adoptar la definición real de Backoffice: precio parametrizado por categoría (`general` | `especial`, una por evento) y catálogo de locaciones sincronizado desde ellos, incluyendo el flag `apto_eventos`.

**Decisión:** Opción 2.
- `Evento` guarda `categoriaPrecio` (`general` | `especial`, sólo si `esPago = true`), no un monto. El monto se resuelve contra la tarifa vigente de Backoffice (`EVENTO_INSCRIPCION_GENERAL` / `EVENTO_INSCRIPCION_ESPECIAL`) y se congela en `Inscripcion.montoCobrado` al confirmarse, para que un cambio de tarifa no reescriba lo ya cobrado.
- `Locación` se sincroniza desde el catálogo de Backoffice: `id`, `nombre`, `sede`, `capacidad`, `apto_eventos`. No hacen falta sub-tipos de locación ni equipamiento del espacio (confirmado por Backoffice, no les interesa por ahora).

**Motivo:** No es una preferencia de arquitectura — es la definición real que dio el grupo dueño de esa regla de negocio. Supersede a [ADR 0012](0012-catalogo-de-locaciones-panel-propio.md), que asumía lo contrario sin haber consultado todavía al otro grupo.
