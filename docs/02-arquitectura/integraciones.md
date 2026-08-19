# Integraciones con otros módulos

> Documento vivo. Cada fila se actualiza cuando haya novedades de la conversación con el otro grupo. No cerrar código contra un contrato que siga en estado "pendiente" sin dejarlo mockeado y documentado como tal.

| Con quién | Qué necesitamos | Estado | Notas |
|---|---|---|---|
| CORE | Validar token de autenticación (JWT) en cada request | Pendiente | ¿Secreto compartido o JWKS? Bloquea `common/guards/core-jwt.guard.ts` |
| CORE | Descuento/consulta de saldo institucional (inscripciones pagas) | Pendiente | Bloquea HU4 en su versión real (mockeable para 2° entrega) |
| CORE | Envío de notificaciones (recordatorio de evento) | Pendiente | Bloquea HU7. ¿CORE expone una cola/topic al que publicamos, o un endpoint REST? |
| Analítica Institucional | Formato de eventos que emitimos (frecuencia, concurrencia, presentismo) | Pendiente | Definir el shape de los eventos que van a consumir |
| Portal del Estudiante / Portal del Docente | Formato del link/notificación que reciben para llegar al detalle del evento | Pendiente | Depende de cómo termine resuelto el punto de notificaciones con CORE |
| Backoffice Administrativo | Catálogo de sedes/locaciones | **No aplica** | Decidido: se maneja directo en nuestra DB, sin integración |

## Coordinación entre los 10 grupos

Todavía no está definido cómo se van a organizar todos los grupos del TP para facilitar la integración (canal compartido, doc de contratos, referente por módulo, etc.). Es parte de la actividad práctica de Clase 02 y excede lo que puede resolver un solo grupo — queda para la próxima instancia de coordinación general.
