# docs/ — memoria del proyecto

Esta carpeta es la memoria de `uadenet-eventos` entre sesiones y entre personas: cualquiera (o cualquier agente) tiene que poder retomar el trabajo leyendo esto, sin depender de que alguien se acuerde de una conversación pasada. Las convenciones de trabajo (tickets, commits, PRs, reglas de código) no viven acá — viven en [`../AGENTS.md`](../AGENTS.md).

## Por dónde empezar

1. [`01-proyecto/overview.md`](01-proyecto/overview.md) — qué es el módulo, fechas de entrega, con qué grupos integra. **Siempre primero.**
2. La carpeta más cercana al tema que vas a tocar (ver abajo).

## Estructura

| Carpeta | Qué guarda |
|---|---|
| [`01-proyecto/`](01-proyecto/) | Contexto y gestión: qué se construye, para cuándo, en qué orden. |
| [`02-arquitectura/`](02-arquitectura/) | Cómo está construido: stack, estructura del monorepo, dominio, contratos con otros módulos. |
| [`03-diseno/`](03-diseno/) | Fuente de verdad de la UI: tokens, componentes, copy. |
| [`04-guias/`](04-guias/) | Procedimientos ejecutables paso a paso (runbooks). |
| [`decisions/`](decisions/) | ADRs: una decisión de arquitectura por archivo, numerados y append-only. |
| [`archivo/`](archivo/) | Documentos superados que se conservan por trazabilidad. **No son fuente de verdad.** |

### Contenido actual

**`01-proyecto/`**
- [`overview.md`](01-proyecto/overview.md) — qué es el proyecto, fechas de entrega, dependencias externas, board.
- [`backlog.md`](01-proyecto/backlog.md) — historias de usuario, tareas técnicas, DoR/DoD, estimación.
- [`plan-de-definicion.md`](01-proyecto/plan-de-definicion.md) — orden de decisiones por fase, alineado a las tres entregas del TP.

**`02-arquitectura/`**
- [`stack-y-estructura.md`](02-arquitectura/stack-y-estructura.md) — stack, estructura del monorepo, capas, flujo de datos (técnico, por capas).
- [`flujo-de-datos-negocio.md`](02-arquitectura/flujo-de-datos-negocio.md) — diagrama de secuencia del recorrido de negocio: crear evento → inscribirse → pagar → recordatorio → asistencia.
- [`flujo-de-datos-integraciones.md`](02-arquitectura/flujo-de-datos-integraciones.md) — contrato punto por punto: qué estructura viaja en cada entrada/salida del módulo. Versión navegable del entregable en planilla.
- [`modelo-dominio.md`](02-arquitectura/modelo-dominio.md) — entidades y reglas de negocio (tiene TBDs a propósito).
- [`integraciones.md`](02-arquitectura/integraciones.md) — estado de cada contrato con CORE, Analítica y los portales.

**`03-diseno/`**
- [`sistema-diseno.md`](03-diseno/sistema-diseno.md) — tokens, componentes y copy. Los valores viven como variables CSS en `apps/web/app/globals.css`.

**`04-guias/`**
- [`bootstrap.md`](04-guias/bootstrap.md) — inicialización del monorepo desde cero (ya ejecutada; se conserva como referencia del orden y del porqué).

**`decisions/`** — 0001 stack general · 0002 monorepo tooling · 0003 backend framework · 0004 ORM · 0005 contratos compartidos · 0006 entorno de dev DB · 0007 branching strategy · 0008 migración a Neon · 0009 branching dev/main · 0010 estilos de frontend · 0011 vuelta a Supabase.

**`archivo/`**
- [`plan-de-setup-inicial.md`](archivo/plan-de-setup-inicial.md) — primer plan de setup, superado por `04-guias/bootstrap.md`.

## Cómo agregar documentación

- **¿Es una decisión de arquitectura?** → ADR nuevo en `decisions/`, numerado (`00XX-titulo.md`). No se edita un ADR viejo para cambiar la decisión: se agrega uno nuevo que referencie al anterior.
- **¿Es un procedimiento que alguien va a ejecutar paso a paso?** → `04-guias/`.
- **¿Describe cómo funciona el sistema?** → `02-arquitectura/`.
- **¿Es contexto de producto, alcance o gestión?** → `01-proyecto/`.
- **¿Es sobre la UI?** → `03-diseno/`.
- **¿Quedó superado pero conviene no perderlo?** → `archivo/`, con una nota arriba que diga qué lo reemplazó.

Reglas: nombres de archivo en kebab-case y sin numerar (el orden lo da la carpeta); solo `decisions/` numera archivos, porque el número es el identificador del ADR. Si un documento nuevo no entra en ninguna carpeta, se crea una carpeta nueva numerada y se la agrega a esta tabla — no se dejan `.md` sueltos en la raíz de `docs/` ni del repo.

En la raíz del repo solo viven `README.md` (instalar y correr), `AGENTS.md` (convenciones) y `CLAUDE.md` (puntero a `AGENTS.md`).
