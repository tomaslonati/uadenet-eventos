# 03 — Backlog, metodología y convenciones

> Documento vivo. Basado en lo visto en Clase 02 (Metodologías y Escalado Ágil). Cuando se agreguen/cambien historias en Jira, reflejarlo acá o al menos linkear al board — este archivo es el resumen navegable, Jira es la fuente operativa del día a día.

## Framework

Scrum a nivel de nuestro equipo (sprints con fechas fijas, ya cargados en Jira). Los frameworks de escalado (Nexus, SAFe, LeSS) no aplican dentro del grupo — son para coordinar entre los 10 grupos del TP, y ese nivel de coordinación todavía no está definido (ver `04-integraciones.md`).

## Historias de Usuario (formato: As a / I want / So that + Given/When/Then)

**HU1 — Crear evento académico** · Must
Como administrativo quiero crear un evento definiendo locación, cupo, fecha/hora y si es gratuito o pago, para publicarlo.
- Given datos válidos, When guardo, Then el evento se crea y aparece en el listado.
- Given locación ya reservada en ese horario, When guardo, Then se rechaza por conflicto.

**HU2 — Consultar eventos disponibles** · Must
Como usuario quiero ver el listado de eventos, para decidir a cuáles inscribirme.
- Given eventos publicados, When entro al listado, Then veo nombre, fecha, locación, cupo y si es pago.

**HU3 — Inscribirme a un evento gratuito** · Must
Como usuario quiero inscribirme a un evento gratuito, para participar.
- Given cupo disponible y sin conflicto horario, When confirmo, Then quedo inscripto.
- Given conflicto horario con otra inscripción, When intento inscribirme, Then se rechaza.
- Given sin cupo, When intento inscribirme, Then se rechaza.

**HU4 — Inscribirme a un evento pago** · Must
Como usuario quiero inscribirme a un evento pago, para participar descontando el costo de mi cuenta institucional.
- Given saldo suficiente, When confirmo, Then se descuenta el costo y quedo inscripto.
- Given saldo insuficiente, When intento inscribirme, Then se rechaza e informa el motivo.

**HU5 — Ver mis inscripciones** · Should
Como usuario quiero ver mis eventos inscriptos, para hacer seguimiento.

**HU6 — Registrar asistencia** · Must (bloqueada por definir mecanismo — ver `02-modelo-dominio.md`)
Como administrativo quiero registrar la asistencia de un inscripto, para llevar presentismo real.

**HU7 — Recibir recordatorio de evento** · Must (bloqueada por contrato de notificaciones con CORE)
Como usuario inscripto quiero recibir una notificación una semana antes del evento, para no olvidarme.

**HU8 — Ver cupo disponible** · Could
Como administrativo quiero ver cupos restantes de un evento, para anticipar necesidad de más capacidad.

No incluidas por no estar pedidas explícitamente en el TP (no agregar sin confirmar como grupo): cancelación de inscripción, edición/borrado de evento.

## Tareas técnicas / Spikes (no son HU)

Definir modelo de dominio (`02-modelo-dominio.md`) · Definir roles y permisos · Definir stack tecnológico (cerrado, ver `decisions/`) · Definir contrato de integración con CORE · Definir contrato de integración con Analítica · Diseñar y documentar API (Swagger) · Definir mecanismo de verificación de asistencia · Diagrama de arquitectura general del sistema · ~~Setup del monorepo (`BOOTSTRAP.md`)~~ hecho.

## Definition of Ready

Una HU entra a un sprint solo si tiene: descripción As a/I want/So that, criterios Given/When/Then, dependencias identificadas (¿bloqueada por algo de `04-integraciones.md`?), prioridad MoSCoW, estimación hecha en Planning Poker por todo el equipo, mock de la vista si aplica, y — sumado tras la conversación de infraestructura — **dependencias de infraestructura resueltas o explícitamente marcadas como bloqueantes**.

## Definition of Done

Código mergeado a `main` vía PR aprobado · tests unitarios pasando · `turbo run lint typecheck test build` en verde · Swagger actualizado si expone un endpoint · probado manualmente contra los criterios de aceptación · sin secrets commiteados.

## Estimación y prioridad

Planning Poker, secuencia Fibonacci (1, 2, 3, 5, 8, 13) — se hace en equipo, no la asigna una sola persona. Prioridad con MoSCoW (Must / Should / Could / Won't), no Highest/High/Medium/Low de Jira directamente (mapear si hace falta para el campo nativo del board).

## Infraestructura como enabler, no como HU

El setup (repo, monorepo, DB conectada, CI, Vercel) no es ni HU ni tarea técnica de dominio — es un **enabler** que bloquea al resto. Se agrupa en un Epic separado "Infraestructura" y cada HU que lo necesite lleva un link "is blocked by" hacia la tarea de infra correspondiente en Jira. La 1° Entrega (mocks) no depende de esto — puede avanzar en paralelo. La 2° Entrega sí, así que el Epic de Infraestructura tiene que estar resuelto antes de esa etapa.
