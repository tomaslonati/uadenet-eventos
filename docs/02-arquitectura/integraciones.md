# Integraciones con otros módulos

> Documento vivo. Cada fila se actualiza cuando haya novedades de la conversación con el otro grupo. Ver detalle exhaustivo y acuerdos pendientes en [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md).

| Con quién | Qué necesitamos | Estado | Notas |
|---|---|---|---|
| CORE | Validar token de autenticación (JWT) en cada request | Definido por CORE | Tráfico del usuario pasa por CORE (`/api/v1/{modulo}/...`), que reenvía al módulo con usuario ya validado. Tokens se validan localmente contra el JWKS de CORE (clave pública). No requiere llamar a CORE en cada pedido |
| CORE | Descuento/consulta de saldo institucional (inscripciones pagas) | Mockeado (desacoplado) | Confirmado: CORE es el único dueño de la wallet institucional. Eventos pide debitar vía `POST /saldo/descontar`. Desacoplado en `SaldoService` hasta tener el ambiente compartido |
| CORE | Acreditación/recarga de saldo institucional | **No aplica** | Confirmado por arquitectura general: CORE gestiona saldos y recargas. Eventos sólo pide débito |
| CORE | Envío de notificaciones (recordatorio de evento) | Definido por CORE | La campanita del portal y los avisos en tiempo real los manda CORE. Eventos publica `evento.recordatorio` hacia CORE para que lo distribuya al portal del alumno |
| Analítica Institucional | Eventos emitidos (`evento.creado`, `inscripcion.registrada`, `asistencia.confirmada`) | Implementado (salida vía CORE) | Eventos emite los 3 eventos tipados a CORE. CORE los reparte por RabbitMQ a los módulos interesados (Analítica). Ningún módulo publica directo en RabbitMQ de otros ni crea colas ad-hoc |
| Portal del Estudiante / Portal del Docente | Formato del link/notificación que reciben para llegar al detalle del evento | Resuelto vía CORE | Los portales consumen `/api/v1/eventos/{id}` reexpuesto por el gateway de CORE y reciben el aviso mediante la campanita de CORE |
| Backoffice Administrativo | Listado de sedes (`GET /api/v1/backoffice/sedes`) | Implementado (directo con token de servicio) | Consulta directa entre módulos permitida. Requiere token de servicio emitido por CORE (`clientId`/`secret`, cacheado 15 min); Backoffice lo valida con JWKS. Expuesto en backend en `GET /api/v1/sedes` |
| Backoffice Administrativo | Espacios por sede (`GET /api/v1/backoffice/sedes/{sedeId}/espacios?aptoEventos=true`) | Implementado (directo con token de servicio) | Consulta directa permitida. Sincronización periódica en `LocacionesSyncService` |
| Backoffice Administrativo | Tarifa vigente por concepto (`GET /api/v1/backoffice/tarifas/vigente?concepto=&fecha=`) | Implementado (directo con token de servicio) | Consulta directa permitida. Caché en memoria con polling periódico en `TarifasService` (ADR 0014) |
| Backoffice Administrativo | Datos de usuario logueado (`GET /api/v1/backoffice/usuarios/{id}`) | Implementado (directo con token de servicio) | Confirmado: personas y roles son dueños de Backoffice, no se copian. Consulta directa autorizada con token de servicio |

## Coordinación entre los 10 grupos

Reglas fijadas por la coordinación de cátedra (Gonza UADE):
1. **Pasa sí o sí por CORE:** Identidad (login/tokens), tráfico del usuario (gateway `/api/v1/{modulo}/...`), billetera/saldos, avisos entre módulos (repartidos por RabbitMQ) y notificaciones al alumno (campanita).
2. **Directo entre módulos:** Pedidos sincrónicos de datos a su dueño (ej. Eventos a Backoffice por sedes, espacios, tarifas o usuarios). Se envían con token de servicio de CORE (cacheado por ~15 min) y el receptor valida con el JWKS de CORE. Ver [`estado-integraciones-y-faltantes.md`](estado-integraciones-y-faltantes.md) para el detalle operativo.
