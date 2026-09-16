# Integraciones con otros módulos

> Documento vivo. Cada fila se actualiza cuando haya novedades de la conversación con el otro grupo. No cerrar código contra un contrato que siga en estado "pendiente" sin dejarlo mockeado y documentado como tal.

| Con quién | Qué necesitamos | Estado | Notas |
|---|---|---|---|
| CORE | Validar token de autenticación (JWT) en cada request | Pendiente | ¿Secreto compartido o JWKS? Bloquea `common/guards/core-jwt.guard.ts` |
| CORE | Descuento/consulta de saldo institucional (inscripciones pagas) | Pendiente | Contrato propuesto en [`flujo-de-datos-integraciones.md`](flujo-de-datos-integraciones.md); mockeado en `apps/api/src/common/core/saldo.service.ts` con saldo fijo. No reemplazar por HTTP hasta que CORE publique el endpoint |
| CORE | Acreditación/recarga de saldo institucional | **No aplica** | La consigna asigna las acreditaciones a CORE (y la carga de saldo puntualmente al Portal del Estudiante). Este módulo sólo consulta y descuenta saldo, nunca lo acredita — `/cuenta` es de solo lectura |
| CORE | Envío de notificaciones (recordatorio de evento) | Pendiente | Bloquea HU7. ¿CORE expone una cola/topic al que publicamos, o un endpoint REST? |
| Analítica Institucional | Formato de eventos que emitimos (frecuencia, concurrencia, presentismo) | Pendiente | Definir el shape de los eventos que van a consumir |
| Portal del Estudiante / Portal del Docente | Formato del link/notificación que reciben para llegar al detalle del evento | Pendiente | Depende de cómo termine resuelto el punto de notificaciones con CORE |
| Backoffice Administrativo | Espacios por sede (`id`, `sedeId`, `codigo`, `nombre`, `tipo`, `capacidad`, `aptoEventos`, `estado`) | Pendiente | Path y shape reales confirmados por el grupo — ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md) y [`flujo-de-datos-integraciones.md`](flujo-de-datos-integraciones.md). Se pide por sede, no hay listado global; la sede llega como `sedeId`, le pedimos a Backoffice que embeba el nombre y todavía no confirmaron. Falta implementar (mock y contratos siguen con el shape viejo) |
| Backoffice Administrativo | Tarifa vigente por concepto (`EVENTO_INSCRIPCION_GENERAL` \| `EVENTO_INSCRIPCION_ESPECIAL`) | Pendiente | Path y shape reales confirmados por el grupo (`concepto`, `monto` decimal, `moneda`, `vigencia`, `tarifaId`) — ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md). Se resuelve al momento del cobro vía un caché local con polling, no en vivo por request — ver [ADR 0014](../decisions/0014-cache-de-tarifas-por-polling.md). Si no hay tarifa vigente (404), no se permite crear el evento ni confirmar la inscripción. Mock actual (`apps/api/src/common/backoffice/tarifas.service.ts`) y contratos todavía con el shape viejo, falta actualizar |

## Coordinación entre los 10 grupos

Todavía no está definido cómo se van a organizar todos los grupos del TP para facilitar la integración (canal compartido, doc de contratos, referente por módulo, etc.). Es parte de la actividad práctica de Clase 02 y excede lo que puede resolver un solo grupo — queda para la próxima instancia de coordinación general.
