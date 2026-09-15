# ADR 0009 — Branching: agregar `dev` como rama de integración

**Contexto:** ADR 0007 definió un único branch base (`main`) para simplificar el flujo con un equipo chico. En la práctica, sin una rama de integración intermedia, cada feature branch mergeada a `main` deja `main` inestable entre entregas, y no hay un punto claro de "código en progreso" separado de "código mostrado en la entrega".

**Opciones consideradas:**
1. Mantener un único `main` (statu quo de ADR 0007).
2. Agregar `dev` como rama de integración: feature branches nacen de `dev` y se mergean ahí; `main` se actualiza solo antes de cada entrega vía PR `dev → main`.

**Decisión:** Opción 2. `dev` pasa a ser la rama por defecto del repo. `main` queda protegida y estable, reservada para el estado que se muestra en cada entrega (16/09, 11/11, entrega final).

**Motivo:** Con varias personas trabajando en paralelo sobre distintas HU, conviene que `main` no cambie constantemente — separa "lo que se está integrando" de "lo que se entrega". El costo de sincronización que ADR 0007 quería evitar se acepta ahora a cambio de un `main` siempre demostrable.

**Flujo de trabajo:**
1. Cada branch de feature/fix nace de `dev` (no de `main`), nombrada por el ticket: `SCRUM-XXX-descripcion-corta`.
2. PR contra `dev`. Requiere al menos 1 aprobación de otra persona del equipo antes de mergear (regla forzada en GitHub, incluye a administradores del repo).
3. Antes de cada fecha de entrega, se abre un PR `dev → main` con el estado a mostrar.
4. `main` mantiene su protección de ADR 0007 (sin push directo, solo vía PR).

**Impacto en decisiones previas:**
- Supersede a ADR 0007 en la cantidad de ramas base (pasa de una a dos); se mantiene su regla de "sin push directo a main".
- `AGENTS.md` (sección Pull Requests) actualizado para reflejar este flujo.
