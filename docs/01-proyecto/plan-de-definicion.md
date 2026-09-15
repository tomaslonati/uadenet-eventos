# Plan de definición — Módulo 6: Eventos Académicos

Orden sugerido de decisiones, alineado con las tres entregas del TP.

## Fase 0 — Antes de tocar código

1. **Modelo de dominio.** Definir entidades y atributos: Evento (locación, cupo, fecha/hora inicio-fin, gratuito/pago, precio), Locación, Inscripción, Usuario (rol: estudiante/docente/administrativo), Asistencia. Sin esto no se puede avanzar con nada más.
2. **Reglas de negocio a formalizar en código.** Traducir cada regla del enunciado a lógica concreta:
   - Cómo se detecta solapamiento de horarios (para locación y para usuario inscripto).
   - Qué pasa si un evento paga se cancela o si falla el cobro.
   - Cómo se marca y valida la asistencia.
   - Cuándo y cómo se dispara el recordatorio de "una semana antes".
3. **Roles y permisos dentro del módulo.** Qué puede hacer administrativo (alta/gestión de eventos) vs. estudiante/docente (consulta/inscripción).

## Fase 1 — Diseño técnico (previo a la primera entrega)

4. **Stack tecnológico.** Backend, base de datos, framework de frontend. Justificarlo porque hay que defenderlo en las entregas.
5. **Contratos de integración con otros módulos** (aunque se mockeen después):
   - CORE: autenticación (login con mail institucional), notificaciones, descuento de saldo para inscripciones pagas.
   - Analítica Institucional: qué eventos/datos van a emitir para que armen sus estadísticas (frecuencia, concurrencia, presentismo).
   - Backoffice Administrativo: catálogo de sedes/locaciones se maneja directo por DB, no vía integración.
   - Portal del Estudiante / Docente: formato del link/notificación que reciben para llegar al portal de eventos.
6. **Definición de API (endpoints).** Alta de evento, listado/búsqueda, inscripción, baja de inscripción, marcar asistencia, consulta de cupo disponible. Documentar con Swagger o Postman desde el arranque, no al final.

## Fase 2 — Primera entrega

7. **Mocks de cada vista.** Alta de evento (admin), listado/búsqueda de eventos, detalle + inscripción, panel de "mis inscripciones", marcado de asistencia.
8. ~~**Diagrama de flujo de datos.**~~ Hecho: [`../02-arquitectura/flujo-de-datos-negocio.md`](../02-arquitectura/flujo-de-datos-negocio.md).

## Fase 3 — Segunda entrega

9. **Mecanismo de verificación de asistencia.** Elegir método concreto (QR, código, check-in manual) e implementarlo.
10. **Mockear las integraciones** (CORE, Analítica) con respuestas simuladas que respeten el contrato ya definido en el punto 5, para no tener que rediseñar nada en la entrega final.
11. **Módulo funcional end-to-end** con esos mocks: creación de evento, inscripción con validación de concurrencia, cobro simulado, recordatorio simulado.

## Fase 4 — Entrega final

12. **Reemplazar mocks por integraciones reales** con los demás grupos (requiere coordinar contratos de API con ellos con anticipación — por eso el punto 5 va temprano).
13. **README** de instalación y ejecución.
14. **Diagrama de arquitectura general del sistema** (no solo del módulo), coordinado con el resto de los grupos.

## Nota

Los puntos 1, 2 y 5 son los que más conviene cerrar rápido como grupo, porque todo lo demás depende de ellos y el punto 5 además depende de coordinar con otros equipos (CORE, Analítica) — cuanto antes se define el contrato, menos retrabajo en la entrega final.
