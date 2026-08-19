# AGENTS.md — uadenet-eventos

Convenciones del proyecto. Aplican tanto a personas como a asistentes de IA (Claude, Copilot, Cursor, etc.) que trabajen en este repo. Se usa `AGENTS.md` en vez de un archivo específico de una sola herramienta para que valga sin importar con qué IA trabaje cada uno del equipo.

---

## Stack

Next.js (apps/web) + NestJS (apps/api) + Drizzle + Supabase (Postgres) + TypeScript, monorepo con Turborepo + pnpm, deploy en Vercel. Detalle completo de la arquitectura en `docs/02-arquitectura/stack-y-estructura.md`, y el porqué de cada elección en `docs/decisions/`.

---

## Tickets

- Todo el trabajo se gestiona en Jira, proyecto **SCRUM**.
- No se trabaja sin ticket: si la tarea que vas a hacer no tiene un ticket creado en el board, lo primero es crearlo (con su Epic correspondiente) antes de escribir código o abrir un branch.
- El nombre del branch es el ticket, creado desde `dev` (ver ADR 0009):
  - Si es una Historia de Usuario del backlog (`docs/01-proyecto/backlog.md`), usar su número de HU: `HU2-descripcion-corta`.
  - Si es una tarea técnica/infra sin HU asociada, usar el issue de Jira: `SCRUM-XXX-descripcion-corta`.
- Un branch = una tarea = un ticket. No mezclar dos historias en el mismo branch.
- Antes de arrancar una tarea, pasarla a "En curso" en el board.

---

## Commits

- Formato: `tipo: [ID] descripción en minúscula`, con el mismo `ID` que el branch (`HU2` o `SCRUM-XXX`).
  Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
  Ejemplos: `fix: [HU2] rompía la inscripción cuando el evento no tenía cupo seteado` · `chore: [SCRUM-14] definir formato de notificación hacia portales`.
- Commits lo más chicos posible: cada cambio coherente es un commit, no un commit gigante al final de la tarea.
- No mezclar cambios no relacionados en el mismo commit (si tocás lint config de paso, va en un commit `chore` separado).

---

## Pull Requests

- Ramas de feature/fix van contra `dev` (ver ADR 0009). Requieren al menos 1 aprobación de otra persona del equipo — regla forzada en GitHub, no se puede mergear el propio PR sin review.
- `dev` se promueve a `main` con un PR `dev → main` antes de cada fecha de entrega. `main` nunca recibe push directo ni PRs de feature branches directamente.
- Título igual al formato del commit, usando el título del ticket de Jira como descripción.
- PR chico y enfocado — si se hace gigante, probablemente el ticket debería haber sido dos.
- Antes de abrir el PR: `turbo run lint typecheck test` en verde localmente.
- Mergear por rebase (sin squash ni merge commit), historial lineal. Borrar el branch después de mergear.
- Para actualizar contra `dev`: `git pull --rebase origin dev` sobre el branch local + push `--force-with-lease` (nunca merge de `dev` al branch). Conviene hacerlo seguido durante la tarea, no solo justo antes de abrir el PR — evita conflictos grandes de una sola vez.

---

## Documentación

- `README.md` de la raíz siempre actualizado con cómo instalar y correr el proyecto — es un entregable obligatorio del TP, no opcional.
- Toda decisión de arquitectura relevante (elegir un framework, una librería, cambiar un patrón) se documenta en `docs/decisions/` como ADR corto: contexto, opciones consideradas, decisión, motivo. No hace falta que sea largo, 10-15 líneas alcanza.
- El contrato de la API es el spec de Swagger — si un endpoint no está en Swagger, no está terminado.
- Comentarios en el código solo donde agreguen algo que el código no dice por sí solo. No comentar lo obvio.

---

## Mantener `/docs` vivo

`docs/` es la memoria del proyecto entre sesiones y entre personas — el objetivo es que cualquiera (o cualquier agente) pueda retomar el trabajo leyendo esa carpeta, sin depender de que alguien "se acuerde" de una conversación pasada. El mapa completo está en `docs/README.md`, que es el índice de la carpeta y define dónde va cada tipo de documento.

Organización por carpeta:

- `docs/01-proyecto/` — contexto y gestión.
  - `overview.md` — qué es el proyecto, fechas de entregas, dependencias externas. Actualizar si cambia algo de esto.
  - `backlog.md` — historias de usuario, DoR/DoD, estimación. Reflejar acá cualquier cambio grande hecho en Jira.
  - `plan-de-definicion.md` — orden de decisiones por fase, alineado a las tres entregas.
- `docs/02-arquitectura/` — cómo está construido el sistema.
  - `stack-y-estructura.md` — stack y estructura del monorepo. Si el código diverge de lo que dice acá, o se actualiza el documento o se corrige el código — nunca se dejan desincronizados.
  - `modelo-dominio.md` — entidades y reglas de negocio. Tiene TBDs a propósito; cerrarlos a medida que el equipo los defina, no de una sola vez.
  - `integraciones.md` — estado de cada contrato con otros módulos del TP (CORE, Analítica, portales). Actualizar el estado de la tabla apenas haya novedades, no esperar a que esté todo resuelto para tocar el archivo.
- `docs/03-diseno/sistema-diseno.md` — tokens, componentes y copy de la UI. Es la fuente de verdad del frontend: los valores viven como variables CSS en `apps/web/app/globals.css`. No inventar colores, tamaños ni radios fuera de lo que dice este documento.
- `docs/04-guias/` — procedimientos ejecutables paso a paso (runbooks), como el bootstrap del monorepo.
- `docs/decisions/` — un ADR nuevo (numerado, `000X-titulo.md`) cada vez que se tome una decisión de arquitectura no trivial. No se edita un ADR viejo para cambiar la decisión — si algo se revierte, se agrega un ADR nuevo que referencia al anterior y explica por qué cambió.
- `docs/archivo/` — documentos superados que se conservan por trazabilidad. No son fuente de verdad y no se citan como tal; llevan arriba una nota que dice qué los reemplazó.

Reglas de la carpeta:

- No se dejan `.md` sueltos: ni en la raíz del repo (solo `README.md`, `AGENTS.md` y `CLAUDE.md`), ni en la raíz de `docs/` (solo `README.md`).
- Nombres de archivo en kebab-case y sin numerar — el orden lo da la carpeta. La única excepción es `decisions/`, donde el número es el ID del ADR.
- Documento nuevo que no entra en ninguna carpeta existente → se crea una carpeta nueva numerada y se la agrega al índice de `docs/README.md` en el mismo cambio.

Regla para agentes: antes de arrancar una tarea no trivial, leer `docs/01-proyecto/overview.md` y el archivo de `docs/` más relevante al tema. Al terminar una tarea que cambió algo del contexto general (arquitectura, modelo, integraciones, decisiones), actualizar el `.md` correspondiente como parte de la misma tarea, no como un paso aparte que puede quedar pendiente.

---

## Convenciones de código

- Respetar el ESLint/Prettier (o Biome, según lo que se termine de definir) del proyecto. Correr el linter antes de dar una tarea por terminada.
- No agregar features, refactors ni mejoras que no fueron pedidas en el ticket.
- No crear helpers ni abstracciones para un caso de uso único.
- No agregar manejo de errores para escenarios que no pueden ocurrir.
- Estructura de `apps/api` es feature-based (`modules/<feature>/`). Lo transversal va en `common/`, los jobs en background en `workers/`. No reorganizar esta estructura sin discutirlo con el equipo primero.
- Los tipos/schemas compartidos entre `apps/web` y `apps/api` viven en `packages/contracts` — no duplicar definiciones de DTOs en cada app.

---

## Reglas específicas para agentes de IA

- Nunca commitear `.env` ni ningún tipo de credencial o secreto.
- Nunca mencionar herramientas de IA en commits, PRs, issues ni comentarios de código. Los mensajes son como si los hubiera escrito la persona.
- Antes de tocar algo fuera del scope del ticket actual, preguntar en vez de asumir.
- Si una tarea toca `packages/db` (schema, migrations), avisar explícitamente en el grupo antes de correr la migration contra el proyecto Supabase compartido de dev (no hay branching nativo en el free tier) — ver ADR 0011.
- Antes de iniciar el repo desde cero, seguir `docs/04-guias/bootstrap.md` en el orden dado.
