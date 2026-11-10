# Overview del proyecto

> Documento vivo. Se actualiza cada vez que cambia algo relevante del contexto general. No borrar historial de un día para otro: si algo queda obsoleto, tachar o mover a "Decisiones supersedidas" en vez de eliminarlo silenciosamente.

## Qué es esto

Módulo **Eventos Académicos** del sistema **UADEnet** (TPO de Desarrollo de Aplicaciones II, UADE, 2Q 2026). UADEnet es una plataforma modular con 10 módulos desarrollados por distintos grupos; este repo es responsabilidad exclusiva de nuestro grupo.

Requisitos funcionales completos del módulo: ver `TPO - DEA II 2Q 2026.pdf` (carpeta raíz del curso). Resumen: administrativos gestionan eventos (locación, cupo; los crean, los editan y los cancelan con reembolso, ver [ADR 0015](../decisions/0015-ciclo-de-vida-del-evento.md)); estudiantes/docentes/administrativos consultan e inscriben; sin superposición de locación ni de usuario en eventos concurrentes; inscripciones gratis o pagas (descuento de saldo institucional vía CORE); verificación de asistencia; recordatorio automático una semana antes.

## Fechas clave (cronograma de la materia)

| Hito | Fecha |
|---|---|
| 1° Entrega (mocks + flujo de datos) | 16/09/2026 |
| 2° Entrega (funcional, integraciones mockeadas) | 11/11/2026 |
| Entrega Final (integrado) | 02/12/2026 |

## Board de gestión

Jira, proyecto **SCRUM** (`https://desarrollo-de-apps-2.atlassian.net`). Epics por entrega + Taller Práctico. 12 sprints ya creados con fechas. Ver [`backlog.md`](backlog.md) para el detalle de historias y convenciones de backlog.

## Dependencias externas (otros grupos del TP)

Este módulo integra con:
- **CORE** — autenticación (valida token que emite CORE), notificaciones, descuento/consulta de saldo institucional.
- **Analítica Institucional** — consume eventos que emitimos (frecuencia, concurrencia, presentismo).
- **Portal del Estudiante / Portal del Docente** — reciben notificaciones nuestras con link al detalle del evento.
- **Backoffice Administrativo** — dueño del catálogo de sedes y espacios, de las tarifas de inscripción y de los datos del usuario. Consultamos directo, con el token de servicio de CORE (ver [ADR 0013](../decisions/0013-integracion-backoffice-tarifas-y-locaciones.md), que revierte el ADR 0012). Mientras no tengamos su URL real, la API sirve un Backoffice simulado.

El estado de estos contratos (definido / en negociación / pendiente) se trackea en [`../02-arquitectura/integraciones.md`](../02-arquitectura/integraciones.md).

## Resto de la documentación

El mapa completo de `docs/` (qué guarda cada carpeta y dónde va un documento nuevo) está en [`../README.md`](../README.md).
