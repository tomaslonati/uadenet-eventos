# Roles y permisos

> Documento vivo. Describe quién puede hacer qué en el módulo y de dónde sale cada permiso. La identidad y los permisos los define CORE; este módulo solo los consume.

## De dónde sale cada cosa

CORE emite el JWT (RS256) con `roles` y `permissions` (ver [`integraciones.md`](integraciones.md)). El módulo los usa en dos capas:

1. **Permiso de CORE**, verificado por `CoreJwtGuard` con `@RequierePermiso(...)`. El único que usamos es `campus-events:manage`.
2. **Regla de pertenencia**, verificada en el servicio de cada módulo: "solo el creador del evento". Es independiente del permiso: tener `campus-events:manage` no alcanza para tocar el evento de otra persona.

## Rol de dominio

`CoreJwtGuard` (`mapearRolDominio`) y `apps/web/lib/sesion.tsx` (`mapearRolCore`) traducen lo que trae CORE a uno de tres perfiles. Es la misma regla en los dos lados:

| Si el token trae… | Perfil del módulo | Qué ve en la UI |
|---|---|---|
| rol `OPERATIONS_ADMIN` o `ADMIN`, o el permiso `campus-events:manage` | Administrativo | Gestión de eventos, alta, asistencia, y todo lo del resto de los perfiles |
| rol `TEACHER` | Docente | Cartelera, inscripciones, cuenta, avisos |
| cualquier otro | Estudiante | Cartelera, inscripciones, cuenta, avisos |

El perfil no se cambia desde la UI: para ver otra vista hay que entrar con otra cuenta (patrón 2 de [`../03-diseno/sistema-diseno.md`](../03-diseno/sistema-diseno.md)).

Un administrativo sin el permiso explícito `campus-events:manage` igual lo pasa el guard por su rol de dominio (`ADMIN` no trae ese permiso en CORE). Pendiente con CORE: un usuario de prueba con rol `OPERATIONS_ADMIN` real, para validar ese camino sin depender del mapeo (ver [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md)).

## Qué puede hacer cada perfil en la API

"Creador" significa que además del permiso, `eventos.creado_por` coincide con el usuario del token; si no, la API responde `403`.

| Endpoint | Cualquier usuario autenticado | Administrativo (`campus-events:manage`) | Solo el creador del evento |
|---|---|---|---|
| `GET /eventos`, `GET /eventos/:id`, `GET /eventos/:id/cupo` | ✅ | ✅ | |
| `POST /eventos` | | ✅ | |
| `PATCH /eventos/:id` (editar) | | ✅ | ✅ |
| `GET /eventos/:id/impacto` | | ✅ | ✅ |
| `POST /eventos/:id/cancelacion` | | ✅ | ✅ |
| `POST /inscripciones`, `GET /inscripciones`, `DELETE /inscripciones/:id` (las propias) | ✅ | ✅ | |
| `GET /asistencia?eventoId=` | | ✅ | ✅ |
| `POST /asistencia`, `DELETE /asistencia/:inscripcionId` | | ✅ | ✅ |
| `GET /usuarios/me`, `/me/saldo`, `/me/movimientos`, `/me/notificaciones`, `POST /usuarios/me/recargas` | ✅ (los propios) | ✅ | |
| `GET /locaciones`, `/sedes`, `/tarifas` | ✅ | ✅ | |

Reglas que no dependen del perfil:

- Un usuario solo cancela **sus** inscripciones (se busca por `inscripcionId` y `usuarioId`).
- Un evento cancelado o ya iniciado no se edita ni se vuelve a cancelar; uno cancelado no admite inscripciones ni asistencia.
- Cualquiera, aun administrativo, puede inscribirse a eventos de otros.

## Decisiones abiertas

- **Override de administrador:** hoy un administrativo no puede editar, cancelar ni tomar asistencia en el evento de otro. Se eligió así porque HU6 dice "a mis eventos creados" y se aplicó el mismo criterio a editar y cancelar (ver [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md)). Si el equipo quiere que cualquier administrativo pueda cubrir a un colega, es una condición en `EventosGestionService` y en `AsistenciaService`.
