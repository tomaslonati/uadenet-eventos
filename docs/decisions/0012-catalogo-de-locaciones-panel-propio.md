# ADR 0012 — Catálogo de locaciones cargado desde el panel propio, sin integración con Backoffice

**Contexto:** La consigna del TP asigna a Backoffice Administrativo la "gestión de sedes y espacios" (alta y mantenimiento del catálogo de sedes físicas). Nuestro módulo necesita que el administrativo indique una locación al crear cada evento.

**Opciones consideradas:**
1. Integrarse con Backoffice Administrativo: consultar su catálogo de sedes/locaciones vía API antes de publicar un evento.
2. Modelar la locación como un campo propio del alta de evento, cargado directo por el administrativo desde nuestro panel, sin depender de un catálogo maestro externo.

**Decisión:** Opción 2. `Locación.sede`/`Locación.nombre` son texto cargado por el administrativo en `POST /eventos` (reflejado en el mock por el `<Select>` de `/eventos/nuevo`), sin sincronizar contra Backoffice.

**Motivo:** Para el alcance de este TP, depender del catálogo de otro grupo para poder dar de alta un evento agrega una dependencia cruzada entre dos módulos sin necesidad real — el dato que Eventos necesita (nombre de la locación) ya lo tiene quien crea el evento. Si más adelante aparece la necesidad de un catálogo compartido y validado centralmente, es una integración nueva con su propio ADR.
