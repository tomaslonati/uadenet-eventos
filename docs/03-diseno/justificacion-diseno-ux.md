# Justificación de diseño y UX

> Documento vivo. Explica el **porqué** de las decisiones de diseño y UX del frontend, conectando tres puntos: lo que pide la consigna del TPO, las reglas de negocio de [`modelo-dominio.md`](../02-arquitectura/modelo-dominio.md), y lo que hoy existe implementado en `apps/web`. El **qué** (tokens, componentes, copy) sigue viviendo en [`sistema-diseno.md`](sistema-diseno.md); no se duplica acá.

## 1. Punto de partida: qué pide la consigna

El TPO (`TPO - DEA II 2Q 2026.pdf`, sección 6) define el módulo con siete reglas, sin mencionar UI en ningún momento:

- Administrativos gestionan eventos con locación y cupo máximo.
- Estudiantes, docentes y administrativos consultan e inscriben.
- No se puede reservar la misma locación para dos eventos concurrentes.
- No se puede inscribir a una persona a dos eventos concurrentes.
- Inscripciones gratis o pagas, descontando saldo institucional.
- Debe existir un método para comprobar asistencia.
- Recordatorio automático una semana antes del evento.

A esto se suman dos condicionantes de los "Requerimientos generales" del TPO que no son específicos del módulo pero sí determinan cómo se diseñó: el sistema "debe estar preparado para operar en múltiples sedes", y la primera entrega pide explícitamente **mocks de cada vista**, no wireframes ni specs — pantallas que se puedan recorrer. Esas nueve frases son el checklist contra el que se justifica cada pantalla de acá en adelante: si una decisión de diseño no traza a una de ellas (o a una historia del backlog derivada), no tiene por qué estar.

## 2. Principio rector: institucional sobrio, no un producto de consumo

`sistema-diseno.md` fija el principio como "institucional sobrio, minimalista, sin adornos": una sola tipografía, paleta acotada a un acento, jerarquía por tamaño y peso en vez de color o cajas. La razón de fondo no es estética: **UADEnet es un mosaico de 10 módulos hechos por 10 grupos distintos** (TPO, "Requerimientos generales"), sin un design system compartido impuesto entre equipos. Un estudiante navega de este módulo al de Comedor o al de Biblioteca en la misma sesión. Si cada módulo compite por atención con color y decoración, la plataforma se siente inconsistente aunque cada pieza individual esté bien resuelta. Sobriedad acá es una apuesta por que este módulo se perciba como parte de un sistema institucional, no como una app aparte — jugando a favor de la integración aun cuando la integración real (CORE, Analítica) todavía no está implementada.

La consecuencia práctica es la regla "máximo dos fondos por pantalla, nada de gradientes" y el techo de 600 en el peso de fuente: en pantallas con mucha densidad de datos (tablas de gestión, listados de cartelera) cualquier adorno extra compite con la información que realmente hay que leer rápido — cupo, precio, conflicto.

## 3. Un shell, tres roles, cero pantallas duplicadas

La consigna describe dos poblaciones con permisos distintos (administrativos que gestionan; estudiantes/docentes/administrativos que consultan e inscriben) accediendo al mismo portal. La decisión fue un único `AppShell` (`apps/web/components/shell/app-shell.tsx`) donde el rol de la sesión determina la navegación (`navDe(rol, …)`) y no al revés: no existen `/admin/cartelera` y `/cartelera` como rutas separadas. Esto es el patrón 2 de `sistema-diseno.md` ("misma shell, distinta navegación y permisos; nunca pantallas duplicadas") llevado a código, y evita el costo de mantener dos veces la misma lógica de cupo, precio y conflicto para audiencias distintas.

Dos elementos del shell están puestos ahí por una razón de negocio, no de layout:

- **El selector de sede vive en el header, visible en todas las pantallas.** El TPO pide soporte a múltiples sedes como requisito general del sistema, y acá se convierte en el filtro de primer nivel (patrón 1 de `sistema-diseno.md`): antes de decidir qué evento mirar, el usuario decide dónde. Cartelera, gestión y el selector de "Todas las sedes" comparten la misma fuente (`SEDES`/`TODAS_LAS_SEDES` en `lib/mock/eventos.ts`), así que cambiar de sede filtra todo el módulo de forma consistente en vez de ser un filtro más entre varios.
- **El saldo institucional está fijo al pie del sidebar, no escondido en "Mi cuenta".** Como la mitad de las inscripciones del TPO son pagas y descuentan saldo, mostrarlo todo el tiempo evita que el costo de una inscripción sea una sorpresa recién en el checkout — el usuario ya sabe cuánto tiene disponible antes de llegar al modal de pago.

## 4. Cartelera: tres vistas porque "consultar eventos" no es una sola tarea

La HU2 del backlog ("como usuario quiero ver el listado de eventos, para decidir a cuáles inscribirme") no especifica cómo se navega ese listado, y en la práctica "decidir a cuál ir" es al menos tres tareas distintas: explorar sin objetivo concreto (tarjetas, con jerarquía visual por tipo/precio/cupo), comparar muchos eventos por unos pocos datos clave —fecha, locación, cupo— (tabla), o chequear "qué hay esta semana" con una noción de calendario (agenda, agrupada por mes). `apps/web/components/eventos/vistas-cartelera.tsx` implementa las tres como renderers intercambiables sobre el mismo arreglo de `EventoVista`, calculado una sola vez en `lib/vista-evento.ts`. Eso importa: el estado ("Cupo completo", "Últimos lugares"), el precio formateado y el cupo son una única fuente de verdad independientemente de qué vista esté activa — no hay tres copias de esa lógica que puedan desincronizarse.

Los filtros (`ChipsFiltro` sobre `FILTROS_CARTELERA` en `lib/dominio.ts`) son chips, no un dropdown ni checkboxes en un panel lateral: quedan siempre visibles y su estado activo no compite con el selector de vista, que es una decisión distinta (cómo se ve) y no debería mezclarse con qué se ve.

## 5. Alta de evento: la regla de solapamiento se ve antes de romperse

Esta es la pantalla donde más pesa una regla del TPO: *"No debe poder reservarse la misma locación para dos eventos concurrentes."* La decisión de diseño no fue simplemente validar y rechazar al guardar — es mostrar la ocupación de la locación elegida como una línea de tiempo (`apps/web/app/(app)/eventos/nuevo/page.tsx`, bloque `.ocupacion`) con las reservas existentes y el bloque del evento nuevo dibujado en vivo mientras el administrativo edita fecha y horario. El conflicto se vuelve espacial, no un mensaje de error después de un submit fallido.

Tres decisiones más, todas atadas a la misma regla:

- El formulario es un wizard de tres pasos (datos → locación y cupo → inscripción) en vez de un formulario largo. El paso donde puede haber conflicto queda aislado del resto, así que resolverlo no obliga a releer todo el formulario.
- Cuando hay choque, no alcanza con decirlo: el panel de conflicto ofrece alternativas concretas — otra locación libre en ese horario, u otro horario libre en la misma locación — calculadas con `choquesDe`, `estaLibre` y `primeraFranjaLibre` de `lib/dominio.ts`. Son las mismas funciones que resuelven la regla de negocio, no una heurística de UI aparte: si el frontend ofrece "mover a X", es porque X realmente está libre según la misma lógica que —cuando exista la validación real contra la base— va a rechazar o aceptar la reserva.
- El botón de publicar queda deshabilitado mientras el conflicto no se resuelve, con su propio texto ("Resolvé el conflicto para publicar"). Es el patrón 3 de `sistema-diseno.md`: los conflictos se resuelven antes de confirmar, nunca después.

El panel de "vista previa en cartelera" al costado del formulario cierra el círculo: muestra exactamente la tarjeta que va a ver un estudiante, con los mismos componentes (`Badge`, `Cupo`) que usa la cartelera real. El administrativo no tiene que publicar y después ir a mirar cómo quedó.

## 6. Detalle e inscripción: plata y conflicto de horario, resueltos antes de comprometerse

Acá aplican dos reglas del TPO a la vez: *"No debe permitirse la inscripción de una persona a dos eventos concurrentes"* y el descuento de saldo institucional en inscripciones pagas.

Para la primera, `conflictoDe()` (misma familia de funciones que `choquesDe`, en `lib/dominio.ts`) corre en el cliente antes de abrir cualquier diálogo de pago: si el usuario ya está inscripto a algo que se superpone, ve un modal con las dos tarjetas de evento lado a lado —"Ya inscripto" / "Querés sumarte"— y sus horarios. No hay un intento de inscripción que falle recién en el servidor; el conflicto se explica con contexto, no con un mensaje genérico.

Para la segunda, el checkout muestra arancel, saldo actual y **saldo después de la operación** antes de confirmar — no después. Si el saldo posterior da negativo, el botón de confirmar cambia a "Ver mi cuenta" en vez de quedar deshabilitado sin salida: la regla de copy de `sistema-diseno.md` ("los errores dicen qué pasó y ofrecen salida") aplica literal acá, porque la salida real es cargar saldo, y el sistema lleva directo ahí.

La confirmación, gratuita o paga, siempre entrega una credencial digital. Esa es la respuesta de diseño a *"debe desarrollarse un método para comprobar la asistencia"*: la credencial no aparece el día del evento, existe desde el momento de la inscripción, y es lo primero que se le muestra al usuario en el modal de éxito ("Ver mi credencial").

## 7. Mis inscripciones: el recordatorio automático, hecho visible

El TPO pide un recordatorio automático siete días antes del evento (HU7), hoy bloqueado por el contrato de notificaciones con CORE (ver `integraciones.md`). Mientras ese contrato no exista, la pantalla documenta la regla en vez de asumir que el usuario confía en que "en algún momento llega un mail": muestra la cuenta regresiva al evento y la fecha exacta en que se dispara el aviso (`sumarDias(proximo.fecha, -RECORDATORIO_DIAS)`, mismo `RECORDATORIO_DIAS = 7` que va a usar el job real). Es la misma lógica de "hacer visible la regla de negocio" que la línea de tiempo de ocupación en alta de evento, aplicada acá al recordatorio.

El próximo evento se separa del resto en su propia sección ("Tu próximo evento" vs. "También estás anotado"): jerarquía por urgencia, no una lista plana de inscripciones en orden de creación — es lo que más le importa mirar a alguien que entra a esta pantalla. La credencial se muestra ahí mismo, no en una sección aparte, porque el momento natural en que alguien la busca es antes de salir hacia el evento, no navegando un "wallet" separado.

## 8. Asistencia: dos métodos porque el requisito quedó deliberadamente abierto

El TPO dice "debe desarrollarse un método para comprobar la asistencia", sin especificar cuál. `apps/web/app/(app)/asistencia/control-asistencia.tsx` implementa dos, no uno, y por una razón operativa concreta: un escáner QR en la puerta es rápido pero depende de conectividad y de que cada asistente tenga la credencial a mano; una lista manual es más lenta pero es el respaldo cuando falla lo anterior. El copy lo dice explícito ("Respaldo offline: el operador tilda a mano y la lista se sincroniza cuando vuelve la conexión"), porque es una situación real de un evento presencial masivo, no un caso hipotético.

Un tercer método evaluado —código único mostrado en pantalla para toda la sala— se descartó y quedó documentado en `modelo-dominio.md`: un código compartido por todos los asistentes no puede acreditar a una persona en particular, sólo confirmar que "alguien" entró. Esa misma razón es la que en esta pantalla obliga a que cada ingreso en el registro en vivo esté atado a una persona con nombre y legajo (`Badge` "Validado" por fila), no a un contador genérico.

Los dos indicadores en vivo (acreditados, tasa de asistencia) existen para darle al staff en la puerta feedback inmediato de que el escaneo funcionó, sin salir de la pantalla a revisar un reporte aparte.

## 9. Movimiento: feedback, no decoración

`sistema-diseno.md` fija la regla general: si una animación no da feedback, no indica estado o no evita que algo aparezca de golpe, no va. Elegida a propósito para este módulo: estas pantallas —cartelera, mis inscripciones, asistencia— se ven decenas de veces por semana por el mismo usuario. Un stagger de entrada o un parallax que se nota la primera vez se vuelve fricción la vigésima. Por eso el techo duro de 300ms, por eso no hay entradas escalonadas en listas, y por eso `prefers-reduced-motion` apaga transform pero conserva color y opacidad — son las transiciones que explican qué cambió, no las que decoran.

## 10. Qué es "mock" acá y qué no

La primera entrega del TPO pide "mocks de cada vista". La decisión fue no resolver eso con imágenes estáticas ni HTML suelto, sino con rutas reales de Next.js que leen de `lib/mock/eventos.ts` en vez de la API (ver ADR 0010, CSS Modules + tokens propios). La lógica de dominio que importa —`conflictoDe`, `choquesDe`, `estaLibre`, `primeraFranjaLibre`, `filtrarEventos`— vive en `lib/dominio.ts` con la misma forma que va a tener cuando deje de operar sobre el arreglo en memoria y empiece a validar contra la base. Lo que cambia en la segunda entrega (ver `backlog.md`, tabla de estado de implementación) es de dónde vienen los datos, no cómo se decide con ellos ni cómo se muestran. Es la razón por la que vale la pena documentar estas decisiones ahora: no son de una maqueta descartable, son las que van a seguir en pie cuando `apps/web` hable con `apps/api`.

## Referencias

- [`sistema-diseno.md`](sistema-diseno.md) — tokens, componentes y copy (la fuente de verdad de la UI).
- [`../02-arquitectura/modelo-dominio.md`](../02-arquitectura/modelo-dominio.md) — entidades y reglas de negocio contra las que se valida cada pantalla.
- [`../01-proyecto/backlog.md`](../01-proyecto/backlog.md) — historias de usuario y estado de implementación (mock vs. backend vs. punta a punta).
- [`../decisions/0010-estilos-frontend.md`](../decisions/0010-estilos-frontend.md) — por qué CSS Modules y no un framework de estilos.
- `TPO - DEA II 2Q 2026.pdf`, sección 6 — consigna original del módulo.
