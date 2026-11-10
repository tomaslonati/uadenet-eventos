# Guion de demo

> Recorrido de unos 12 minutos para presentar el módulo, con los chequeos que conviene hacer antes. No es una especificación: si cambia una pantalla, se ajusta este guion.

## Antes de presentar

1. **La migration `0003` está aplicada** en Supabase ([`aplicar-migraciones.md`](aplicar-migraciones.md)). Sin ella la API nueva falla en cada consulta de eventos.
2. **La API responde**: `GET /health` y `GET /api/v1/locaciones` (tiene que devolver las locaciones sincronizadas; si viene vacío, la sincronización con Backoffice no corrió).
3. **Las tres cuentas entran.** Contra el CORE real, las cuentas son las que muestra la pantalla de login ("Cuentas del prototipo", definidas en `CUENTAS_DEMO` de `apps/web/lib/sesion.tsx`); en local con CORE simulado, las del [README](../../README.md#pantallas).
4. **El estudiante tiene saldo.** Contra el CORE real las billeteras de prueba pueden estar en cero: cargar desde `/cuenta` (recarga de prueba) antes de la demo. Contra el CORE simulado ya arrancan con saldo.
5. **El recordatorio automático** (HU7) no se puede mostrar en vivo: sale una vez por día. Para explicarlo, tener a mano un evento a 7 días con un inscripto y, si hace falta, llamar al cron a mano: `curl -H "Authorization: Bearer $CRON_SECRET" https://<api>/api/v1/cron/diario` (el aviso aparece en `/avisos` del inscripto).
6. **Dos ventanas**: una con el administrativo y otra (privada) con el estudiante, para ver los dos lados sin cerrar sesión.
7. Plan B si CORE o Supabase no responden: levantar todo en local (`pnpm dev` sin `CORE_BASE_URL`) con una base propia; el CORE y el Backoffice se simulan solos.

## Recorrido

**1. Crear un evento y la regla de la locación** (administrativo → `/gestion` → *Nuevo evento*, HU1)
- Completar los tres pasos. En el paso 2, elegir una locación y un horario ya ocupados: la línea de ocupación muestra el choque y el panel ofrece alternativas (otra locación libre, otro horario).
- Elegir una libre y publicar. Mostrar la vista previa de cartelera del costado.
- Crear un segundo evento **arancelado** (categoría `general`: el precio lo define Backoffice) y uno con **cupo 1** para mostrar "cupo completo".

**2. Consultar e inscribirse** (estudiante → `/cartelera`, HU2/HU3/HU4)
- Buscar por texto y filtrar por período y por gratuitos/arancelados. Cambiar de vista (tarjetas, tabla, agenda) y de sede.
- Inscribirse al gratuito. Intentar inscribirse a otro **a la misma hora**: conflicto de horario explicado con las dos tarjetas lado a lado.
- Entrar al arancelado con saldo insuficiente: el checkout muestra el saldo posterior y ofrece *Ver mi cuenta*. Recargar y volver a pagar.
- `/mis-inscripciones`: la credencial QR y la fecha del recordatorio (HU5/HU7).

**3. Seguimiento y edición** (administrativo → detalle del evento)
- En el panel de gestión: inscriptos con su asistencia, presentismo, recaudación y *Exportar CSV*.
- *Editar evento*: cambiar el título y guardar (no avisa a nadie). Intentar bajar el cupo por debajo de los inscriptos, o cambiar el precio con inscriptos: la UI lo bloquea con el motivo.
- Cambiar la **fecha**: el modal muestra "antes → después" y "Guardar y avisar a N".

**4. Lo que ve el estudiante** (ventana del estudiante)
- `/avisos`: llegó el aviso de reprogramación. El detalle del evento muestra el banner *Reprogramado*.
- Cancelar su inscripción **aunque falten menos de 24 horas** (la reprogramación lo habilita) y ver el reembolso en `/cuenta`.

**5. Cancelar un evento con reembolso** (administrativo)
- Inscribir de nuevo al estudiante en un evento pago y, como administrativo, *Cancelar evento*: el modal muestra cuántos inscriptos, cuánto se devuelve y pide el motivo.
- Confirmar. El resultado dice cuántos reembolsos se acreditaron y cuántos quedaron pendientes (si alguno falló en CORE, *Reintentar reembolsos*).
- Estudiante: `/mis-inscripciones` ("Canceladas por el organizador" con el estado del reembolso), `/avisos` y el saldo en `/cuenta`. En `/cartelera` el evento ya no aparece.
- Volver a crear un evento en esa misma locación y horario: la locación quedó libre.

**6. Asistencia** (administrativo → `/asistencia`, HU6)
- Hace falta un evento que empiece dentro de la próxima hora (la toma de asistencia se habilita 1 hora antes): crearlo antes de la demo.
- Mostrar el escaneo de QR y la lista manual con búsqueda; registrar y revertir un ingreso.

## Si preguntan…

| Pregunta | Respuesta y dónde está |
|---|---|
| ¿Cómo se valida que dos eventos no usen la misma locación? | `EventosService.crear` y `EventosGestionService.actualizar` (consulta de solapamiento en la base) y la línea de ocupación del formulario. Tests en `eventos.service.spec.ts` y `eventos-gestion.service.spec.ts` |
| ¿Y que una persona no esté en dos eventos a la vez? | `InscripcionesService.crear`, y al reprogramar, `EventosGestionService` rechaza el cambio si algún inscripto quedaría con otro evento |
| ¿Qué pasa con la plata si se cancela? | Reversa en CORE por inscripción, idempotente, con reintento de pendientes ([ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md)) |
| ¿Quién puede gestionar un evento? | Solo su creador, y debe tener `campus-events:manage` ([`roles-y-permisos.md`](../02-arquitectura/roles-y-permisos.md)) |
| ¿Cómo se integra con los otros módulos? | [`diagrama-arquitectura.md`](../02-arquitectura/diagrama-arquitectura.md), [`integraciones.md`](../02-arquitectura/integraciones.md) y el Swagger en `/api/docs` |
| ¿Qué falta? | [`estado-integraciones-y-faltantes.md`](../02-arquitectura/estado-integraciones-y-faltantes.md), sección 4. Lo principal: confirmar con CORE y Analítica los tipos nuevos, el Backoffice real, y disparar el recordatorio en Vercel |
| ¿Cómo sé que anda? | `turbo run lint typecheck test build` y el Swagger como contrato |
