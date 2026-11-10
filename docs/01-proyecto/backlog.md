# Backlog, metodología y convenciones

> Documento vivo. Basado en lo visto en Clase 02 (Metodologías y Escalado Ágil). Cuando se agreguen/cambien historias en Jira, reflejarlo acá o al menos linkear al board — este archivo es el resumen navegable, Jira es la fuente operativa del día a día.

## Framework

Scrum a nivel de nuestro equipo (sprints con fechas fijas, ya cargados en Jira). Los frameworks de escalado (Nexus, SAFe, LeSS) no aplican dentro del grupo — son para coordinar entre los 10 grupos del TP, y ese nivel de coordinación todavía no está definido (ver [`../02-arquitectura/integraciones.md`](../02-arquitectura/integraciones.md)).

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

**HU6 — Registrar asistencia** · Must
Como administrativo quiero registrar la asistencia de un inscripto a mis eventos creados, para llevar presentismo real.
- El registro solo puede realizarse por el administrativo creador del evento.
- Valida la pertenencia de la inscripción al evento específico tanto en modo QR (validando credencial o legajo) como en modo manual (con búsqueda reactiva por nombre o legajo).
- Permite registrar el ingreso y revertirlo/desmarcarlo en caso de error.

**HU7 — Recibir recordatorio de evento** · Must (bloqueada por contrato de notificaciones con CORE)
Como usuario inscripto quiero recibir una notificación una semana antes del evento, para no olvidarme.

**HU8 — Ver cupo disponible** · Could
Como administrativo quiero ver cupos restantes de un evento, para anticipar necesidad de más capacidad.

**Cancelación de inscripción con reembolso** (agregada fuera del TP por pedido del equipo): `DELETE /api/v1/inscripciones/:id`, hasta 24 hs antes del inicio y mientras no haya asistencia registrada. Borra la inscripción (libera el cupo) y, si fue paga, devuelve el monto con una reversa del débito en CORE (`POST /internal/v1/wallet-transactions/{id}/reversals`, el cobro se ubica por `externalReference` = id de la inscripción).

**Gestión del evento por su creador** (agregada fuera del TP por decisión del equipo, ver [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md)). Como administrativo creador de un evento quiero modificarlo o cancelarlo, para corregir errores y reaccionar a imprevistos sin dejar a los inscriptos a ciegas.
- Given un evento publicado que todavía no empezó, When el creador cambia título, descripción o cupo, Then se guarda sin avisar a nadie; el cupo no puede quedar por debajo de los inscriptos actuales.
- Given un evento con inscriptos, When el creador intenta cambiar si es pago o su categoría de precio, Then se rechaza con el motivo (los montos ya cobrados quedarían inconsistentes).
- Given un evento con inscriptos, When el creador cambia la fecha, el horario o la locación, Then la UI muestra el cambio y a cuántos va a avisar, la locación se revalida contra otros eventos, se rechaza si algún inscripto quedaría con otro evento en el nuevo horario, y al guardar cada inscripto recibe un aviso y puede cancelar su inscripción hasta el inicio, sin el límite de 24 hs.
- Given un evento publicado sin asistencias, When el creador lo cancela con un motivo, Then cada inscripción pasa a `cancelada`, cada pago se devuelve a la cuenta institucional (reversa en CORE), cada inscripto recibe un aviso con el motivo y el estado de su reembolso, y la locación queda libre.
- Given que algún reembolso no se pudo confirmar en CORE, When el creador repite la cancelación, Then solo se reintentan los pendientes: no se devuelve dos veces ni se vuelve a avisar.
- Given un evento ya iniciado, cancelado o con asistencias registradas, When se intenta modificar o cancelar, Then se rechaza y la UI lo muestra deshabilitado con el motivo.

**Seguimiento del evento** (mejora sobre HU6/HU8). Como creador quiero ver, en la pantalla del evento, quiénes están inscriptos y su asistencia, con el presentismo y la recaudación, y poder exportarlo a CSV.

**Búsqueda en la cartelera** (mejora sobre HU2): búsqueda por texto (título, tipo, disertante, locación) y filtro por período, además de los filtros por precio y cupo.

Sigue fuera de alcance: borrado físico de eventos, lista de espera, y cualquier cambio que el TP no pida y el grupo no haya confirmado.

## Estado de implementación

Que el backend funcione no significa que la historia esté entregada: el DoD exige además PR aprobado y mergeado a `dev`, y eso se ve en GitHub, no se replica acá. Lo que sigue es el estado del código a 10/11/2026.

| HU | Prioridad | Backend | Front conectado a la API | Notas |
|---|---|---|---|---|
| HU1 crear evento | Must | ✅ | `/eventos/nuevo` | Valida solapamiento de locación contra la base. Locaciones y tarifas vienen de Backoffice |
| HU2 consultar eventos | Must | ✅ | `/cartelera` (tarjetas / tabla / agenda) | Con búsqueda por texto y filtros por período, precio y cupo |
| HU3 inscripción gratuita | Must | ✅ | `/eventos/[id]` | Rechaza por cupo y por conflicto horario del usuario |
| HU4 inscripción paga | Must | ✅ | `/eventos/[id]`, `/cuenta` | Débito idempotente contra CORE. Probado contra el CORE simulado; contra el CORE real falta cargar saldo en las billeteras de prueba |
| HU5 mis inscripciones | Should | ✅ | `/mis-inscripciones` | Incluye cancelar la inscripción (con reembolso) y las bajas por cancelación del evento |
| HU6 registrar asistencia | Must | ✅ | `/asistencia` | Solo el creador; QR y lista manual; se habilita 1 hora antes del inicio |
| HU7 recordatorio | Must | ✅ | `/avisos` | `RecordatoriosService` publica en CORE a los 7 días. En Vercel lo dispara un cron diario ([ADR 0016](../decisions/0016-cron-diario-de-vercel.md)): falta definir `CRON_SECRET` y mergear a `main` |
| HU8 ver cupo | Could | ✅ | `/gestion`, panel del evento | Cupo, presentismo y recaudación del evento |
| Gestión del evento (extra) | — | ✅ | `/eventos/[id]/editar`, panel en `/eventos/[id]` | Editar y cancelar con reembolso y avisos (ADR 0015). **Requiere aplicar la migration `0003`** |

`apps/web` ya no lee datos de prueba: todo sale de `apps/api`. La API valida el JWT de CORE en cada request (`CoreJwtGuard`). Cobertura: la API tiene tests unitarios de las reglas de negocio (solapamiento de locación y de usuario, cupo, saldo, edición y cancelación del evento); se corren con `turbo run test`.

Pendientes de integración que no dependen de este código (Backoffice real, usuario de prueba `OPERATIONS_ADMIN`, tipos de notificación y de evento nuevos): ver [`../02-arquitectura/estado-integraciones-y-faltantes.md`](../02-arquitectura/estado-integraciones-y-faltantes.md).

## Tareas técnicas / Spikes (no son HU)

~~Definir modelo de dominio~~ hecho (`../02-arquitectura/modelo-dominio.md`) · ~~Definir roles y permisos~~ hecho (`../02-arquitectura/roles-y-permisos.md`) · ~~Definir stack tecnológico~~ hecho (ver `../decisions/`) · ~~Contrato de integración con CORE, Analítica y Backoffice~~ implementado de nuestro lado (`../02-arquitectura/integraciones.md`); lo que queda abierto es confirmar con cada grupo los puntos listados en `estado-integraciones-y-faltantes.md` · ~~Diseñar y documentar API (Swagger)~~ hecho, los endpoints están en `/api/docs` · ~~Definir mecanismo de verificación de asistencia~~ hecho (verificación en puerta por creador en modo QR y lista manual) · ~~Conectar `apps/web` a la API real~~ hecho · ~~Diagrama de arquitectura general del sistema~~ hecho (`../02-arquitectura/diagrama-arquitectura.md`) · ~~Setup del monorepo (`../04-guias/bootstrap.md`)~~ hecho · Definir `CRON_SECRET` en Vercel para el cron del recordatorio · Aplicar la migration `0003` (`../04-guias/aplicar-migraciones.md`).

## Pantallas por historia del board

| Historia del board | Pantalla |
|---|---|
| Alta de evento (admin) | `/eventos/nuevo` (el mismo formulario edita en `/eventos/[id]/editar`) |
| Listado y búsqueda de eventos | `/cartelera` |
| Detalle e inscripción a evento | `/eventos/[id]` |
| Mis inscripciones | `/mis-inscripciones` |
| Marcado de asistencia | `/asistencia` (QR, lista manual) |

Además, sin historia propia en el board todavía: `/gestion` (panel del administrativo con indicadores y acceso a editar), `/cuenta` (saldo institucional y movimientos) y `/avisos` (notificaciones de CORE: recordatorios, reprogramaciones y cancelaciones). Si el equipo las quiere trackear, hay que crearles el ticket.

## Definition of Ready

Una HU entra a un sprint solo si tiene: descripción As a/I want/So that, criterios Given/When/Then, dependencias identificadas (¿bloqueada por algo de `../02-arquitectura/integraciones.md`?), prioridad MoSCoW, estimación hecha en Planning Poker por todo el equipo, mock de la vista si aplica, y — sumado tras la conversación de infraestructura — **dependencias de infraestructura resueltas o explícitamente marcadas como bloqueantes**.

## Definition of Done

Código mergeado a `dev` vía PR aprobado (ver ADR 0009) · tests unitarios pasando · `turbo run lint typecheck test build` en verde · Swagger actualizado si expone un endpoint · probado manualmente contra los criterios de aceptación · sin secrets commiteados.

## Estimación y prioridad

Planning Poker, secuencia Fibonacci (1, 2, 3, 5, 8, 13) — se hace en equipo, no la asigna una sola persona. Prioridad con MoSCoW (Must / Should / Could / Won't), no Highest/High/Medium/Low de Jira directamente (mapear si hace falta para el campo nativo del board).

## Infraestructura como enabler, no como HU

El setup (repo, monorepo, DB conectada, CI, Vercel) no es ni HU ni tarea técnica de dominio — es un **enabler** que bloquea al resto. Se agrupa en un Epic separado "Infraestructura" y cada HU que lo necesite lleva un link "is blocked by" hacia la tarea de infra correspondiente en Jira. La 1° Entrega (mocks) no depende de esto — puede avanzar en paralelo. La 2° Entrega sí, así que el Epic de Infraestructura tiene que estar resuelto antes de esa etapa.
