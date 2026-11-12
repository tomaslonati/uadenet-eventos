# ADR 0019 — Cierre de conexiones a la base antes de que Vercel congele la función

**Contexto:** En producción, cada tanto (sobre todo con un recargado forzado, que dispara todos los pedidos juntos) los endpoints que leen la base (`eventos`, `inscripciones`, `locaciones`) se quedaban colgados hasta que el front los cortaba a los 15 s, mientras que `saldo` (que va a CORE, no a la base) respondía normal. Vercel congela la función entre pedidos; el pool de postgres.js (ADR 0011) queda con conexiones abiertas que al descongelarse están muertas, y la query siguiente se escribe en un socket que nunca contesta. El `idle_timeout` del pool no alcanza porque su timer no corre mientras la función está congelada.

**Opciones consideradas:**
1. `attachDatabasePool` de `@vercel/functions`: la solución oficial, pero no soporta postgres.js (solo `pg`, MySQL, MongoDB, etc.).
2. Cambiar el driver a `pg` para poder usar `attachDatabasePool`.
3. Mantener postgres.js y, por cada pedido, extender la vida de la función con `waitUntil` de `@vercel/functions` hasta que el pool cierre las conexiones ociosas.

**Decisión:** Opción 3. `packages/db` baja el `idle_timeout` en Vercel a 5 s y la API registra un middleware (solo en Vercel) que, al cerrarse cada respuesta, mantiene la función viva ese tiempo más un margen.

**Motivo:** Resuelve la causa sin revertir el driver elegido en ADR 0011 y son pocas líneas. Si más adelante se cambia a `pg`, se reemplaza el middleware por `attachDatabasePool`.
