# ADR 0007 — Branching: un único `main`, sin `dev`

**Contexto:** Definir el modelo de branches del repo.

**Opciones consideradas:** `main` + `dev` con protección en ambas (estilo gitflow simplificado) vs un único branch base `main`.

**Decisión:** Un único branch base, `main`. Todo PR va contra `main`, con protección (sin push directo).

**Motivo:** Para un equipo de 5-6 personas y un solo módulo desplegable, mantener `dev` agrega un paso de sincronización extra sin beneficio claro. `main` protegido + PRs chicos + CI en verde antes de mergear da suficiente seguridad sin la fricción de dos ramas base.
