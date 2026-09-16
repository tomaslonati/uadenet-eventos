# ADR 0014 — Tarifa de Backoffice: caché local con polling, no consulta en vivo por request

**Contexto:** Backoffice pide resolver la tarifa de inscripción "al momento del cobro, no al crear el evento" (`GET /api/v1/backoffice/tarifas/vigente`), para tomar siempre la versión vigente. Cumplir eso al pie de la letra significaría llamar a Backoffice de forma síncrona en cada inscripción paga.

**Opciones consideradas:**
1. Consulta en vivo a Backoffice en cada inscripción paga (y en cada listado de eventos, para mostrar el precio).
2. Caché local en `tarifas.service.ts`, refrescado por polling periódico no agresivo; "al momento del cobro" se resuelve leyendo ese caché ya actualizado, sin disparar una llamada nueva por request.

**Decisión:** Opción 2.

**Motivo:** Depender de una llamada externa síncrona en el camino crítico de cada inscripción (y de cada listado de eventos) acopla nuestra disponibilidad a la de Backoffice y agrega latencia en el flujo más usado del módulo. El negocio tolera una ventana chica de desactualización del precio a cambio de no tener ese punto de falla en cada request — la frecuencia exacta del polling queda pendiente de definir (ver `flujo-de-datos-integraciones.md`, "Qué falta confirmar"), pero tiene que ser lo bastante seguido como para que "al momento del cobro" siga siendo una aproximación razonable a la tarifa realmente vigente. Si `GET /api/v1/backoffice/tarifas/vigente` devuelve `404` (sin versión vigente) para la categoría de un evento, no se permite crear ese evento ni confirmar inscripciones a él hasta que el caché tenga una tarifa vigente.
