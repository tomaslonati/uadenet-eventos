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
| Backoffice Administrativo | Catálogo de locaciones (`id`, `nombre`, `sede`, `capacidad`, `aptoEventos`) | Pendiente | Confirmado en el intercambio de preguntas con el grupo — ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md). Falta el path real del endpoint |
| Backoffice Administrativo | Tarifa de inscripción por categoría (`general` \| `especial`) | Pendiente | Reemplaza el precio libre por evento — ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md). Mockeado con valores fijos en `apps/api/src/common/backoffice/tarifas.service.ts`. Falta el path real del endpoint |

## Coordinación entre los 10 grupos

Todavía no está definido cómo se van a organizar todos los grupos del TP para facilitar la integración (canal compartido, doc de contratos, referente por módulo, etc.). Es parte de la actividad práctica de Clase 02 y excede lo que puede resolver un solo grupo — queda para la próxima instancia de coordinación general.
