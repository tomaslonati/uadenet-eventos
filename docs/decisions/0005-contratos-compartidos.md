# ADR 0005 — Contratos compartidos entre web y api

**Contexto:** `apps/web` y `apps/api` necesitan compartir la forma de los datos (DTOs) sin duplicarla ni desincronizarse.

**Opciones consideradas:**
1. Generar tipos automáticamente desde el spec de Swagger/OpenAPI (`openapi-typescript`).
2. Package compartido (`packages/contracts`) con schemas de Zod escritos a mano.

**Decisión:** Opción 2 — `packages/contracts` con Zod.

**Motivo:** Sin paso de generación ni build extra que pueda romperse. Los mismos schemas sirven para validar en NestJS (pipes) y en el frontend (formularios). Más simple de mantener y de explicar en la defensa del TP para un equipo que recién arranca con monorepos. El costo (mantener el schema sincronizado a mano si cambia el DTO) se considera aceptable para el tamaño del equipo y del proyecto.
