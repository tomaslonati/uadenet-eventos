# ADR 0002 — Turborepo + pnpm como tooling de monorepo

**Contexto:** Necesitamos gestionar dos apps (`web`, `api`) y varios packages compartidos en un solo repo.

**Opciones consideradas:** Turborepo vs Nx; npm/yarn vs pnpm.

**Decisión:** Turborepo + pnpm workspaces.

**Motivo:** Turborepo tiene integración nativa con Vercel (remote caching gratis, cero config si se despliega ahí) y alcanza de sobra para un equipo de 5-6 personas con dos apps. Nx se justifica con más escala/complejidad (20+ paquetes, multi-lenguaje) que no es este caso. pnpm es el gestor con mejor soporte de workspaces y el que usan por defecto los templates de Turborepo.
