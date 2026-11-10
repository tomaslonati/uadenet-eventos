# ADR 0016 — Tareas periódicas en Vercel con un cron diario

**Contexto:** la API arranca los recordatorios (HU7), el polling de tarifas y la sincronización de locaciones con `setInterval`, pero en Vercel la API es serverless: la función se congela al responder y esos intervalos no corren. Resultado: en dev y prod el recordatorio no se enviaba nunca. El proyecto usa el plan Hobby, así que la solución tiene que entrar en sus límites.

**Opciones consideradas:**
1. Vercel Cron llamando a un endpoint de la propia API. **Elegida.** En Hobby: una ejecución por día como máximo, hasta 100 crons por proyecto, precisión de ±59 minutos, y cada ejecución es una invocación normal de función (sin costo aparte).
2. Un proceso largo aparte (otro servicio gratuito) con los `setInterval`. Descartada: otro servicio que mantener y otra copia de la configuración.
3. Cron externo (GitHub Actions, cron-job.org) que llame al endpoint. Descartada: depende de un tercero y de guardar el secreto afuera de Vercel; no aporta nada que el cron de Vercel no dé.

**Decisión:**
- Un único cron, `0 11 * * *` (11:00 UTC, 08:00 en Argentina), declarado en `apps/api/vercel.json`, que llama a `GET /api/v1/cron/diario`.
- El endpoint (`CronController`) sincroniza las locaciones y envía los recordatorios, y **espera a que terminen antes de responder**. Va protegido por `CronSecretGuard`: Vercel manda `Authorization: Bearer <CRON_SECRET>`; sin `CRON_SECRET` configurada el endpoint rechaza todo. No usa el JWT de CORE ni aparece en Swagger.
- La hora se eligió lejos de la medianoche UTC a propósito: el recordatorio busca los eventos del día UTC que cae dentro de 7 días, y con la imprecisión de Hobby un horario cercano a las 00:00 UTC podía saltearse o repetir un día.
- Los recordatorios salen en lotes de 5 en paralelo: la función pasa casi todo el tiempo esperando a CORE, así que el costo en CPU es mínimo, y la duración queda lejos de los 300 s que Hobby permite.
- **Tarifas no entran en el cron.** La caché de tarifas es por instancia (se carga en el arranque con `asegurarCargado`); refrescarla desde una invocación del cron no actualizaría las demás instancias.
- En local, o con la API como proceso largo (`pnpm dev`, `pnpm start`), siguen funcionando los `setInterval` de siempre.

**Consecuencias:**
- Vercel solo ejecuta los crons del deployment de **producción**: dev no envía recordatorios por su cuenta, y mientras `main` no reciba este cambio (PR `dev → main`) tampoco prod. Como dev y prod comparten base, el cron de prod recorre todos los eventos.
- Hace falta definir `CRON_SECRET` en el proyecto `uadenet-eventos-api` de Vercel (entorno Production) antes del deploy.
- Un día sin ejecución (caída de Vercel) es un día sin recordatorios: no se guarda a quién ya se le avisó. Si CORE no deduplica los recordatorios repetidos, una ejecución manual el mismo día los reenviaría.
- Un único cron deja libre el margen de Hobby; si el plan cambia, se puede subir la frecuencia sin tocar el código.
