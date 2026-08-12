# ADR 0003 — NestJS como framework de backend

**Contexto:** El backend puede ser Route Handlers de Next.js (todo en una app), Fastify standalone, o NestJS standalone.

**Opciones consideradas:**
1. Route Handlers de Next.js — más simple, un solo deploy, pero mezcla capas de frontend y backend.
2. Fastify — liviano, TypeScript-first, sin estructura impuesta.
3. NestJS — módulos/controllers/services con convención fuerte.

**Decisión:** NestJS, como app separada (`apps/api`) de `apps/web`.

**Motivo:** NestJS impone una arquitectura en capas (controller → service → repository) que coincide con lo que se está viendo en la materia ("arquitectura de capas", integración por servicios REST), lo que facilita justificarlo y defenderlo en las entregas. Además separa responsabilidades de verdad entre frontend y backend, dando más contenido real para el diagrama de arquitectura de la entrega final. Trae Swagger casi gratis vía `@nestjs/swagger`.
