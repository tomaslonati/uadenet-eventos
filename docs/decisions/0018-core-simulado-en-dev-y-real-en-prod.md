# ADR 0018 — CORE simulado en dev, CORE real en prod

**Contexto:** el CORE del grupo 10 no estaba respondiendo bien (logins y billeteras intermitentes) y la entrega 2 admite integraciones mockeadas. Dev se usa para probar y demostrar, así que no puede depender de un servicio caído; prod sí tiene que hablar con el CORE real.

**Opciones consideradas:**
1. Mockear en ambos entornos. Descartada: prod perdería la integración real, que ya está implementada y probada.
2. Un flag de entorno nuevo (`USA_MOCK=true`). Descartada: `CORE_BASE_URL` ya cumplía ese papel (ver `packages/env`); un segundo flag podía quedar en contradicción con el primero.
3. Elegir por `CORE_BASE_URL`. **Elegida.**

**Decisión:**
- Sin `CORE_BASE_URL` (dev, local y tests) la API monta `CoreMockController` (`/api/v1/core/**`): login con JWT RS256 firmado con un par de claves propio, JWKS, token M2M, billetera con idempotencia, reversas, notificaciones y bus de eventos. Con `CORE_BASE_URL` definida (prod) los servicios hablan con el CORE real. La selección vive en `USA_CORE_MOCK` y `obtenerCoreBaseUrl()` (`apps/api/src/common/core/core-crypto.ts`).
- Los servicios no distinguen el modo: todos hacen sus pedidos con `fetchCore`. Con el mock activo y en Vercel, `fetchCore` levanta un servidor HTTP interno (puerto efímero, `127.0.0.1`) con la misma app y apunta ahí, porque una función serverless no tiene un puerto local conocido; en local, con el CORE real o en tests es un `fetch` común. `main.ts` registra la app con `registrarAppCore` antes de escuchar.
- El Backoffice sigue la misma regla con `BACKOFFICE_BASE_URL`, pero resuelve el mock en Vercel con llamadas directas a funciones (ADR 0013); no se unificaron.
- Cuentas del mock: las de demo (`m.ibarra@uadenet.edu`, `e.ruiz@uadenet.edu`, `t.vidal@uadenet.edu`) y las `test.admin`, `test.docente` y `test.estudiante` (`@uade.edu.ar`) que lista la pantalla de login, para que ingresar sea igual contra el mock y contra el CORE real. Son credenciales sandbox.

**Consecuencias:**
- Para que dev quede mockeado, el proyecto de la API en Vercel (entorno dev) **no debe tener `CORE_BASE_URL`**; prod sí. Si alguien la define en dev, dev vuelve a depender del CORE real.
- El estado del mock (saldos, movimientos, notificaciones) vive en memoria de cada instancia: se reinicia con cada arranque y en Vercel puede variar entre instancias. Sirve para demostrar, no para conservar datos.
- Lo de CORE que no se ve en el mock (los tipos `EVENT_RESCHEDULED` y `EVENT_CANCELLED`, la firma `X-Core-Signature`) solo se verifica contra el CORE real, es decir, en prod.
- El test `core-jwt.guard.spec` pide el JWKS a `localhost:3000`: con la API corriendo en ese puerto falla por tomar otra clave. Hay que apagarla para correr los tests.
