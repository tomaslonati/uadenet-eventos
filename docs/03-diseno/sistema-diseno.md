# Sistema de diseño

> Documento vivo. Es la fuente de verdad de la UI del módulo. Los tokens están implementados como variables CSS en `apps/web/app/globals.css`: si cambia algo acá, se cambia ahí — y al revés, no se inventan valores nuevos en un componente.

Referencia común para todas las pantallas de UADEnet, tomada del prototipo del módulo de Eventos Académicos.

Principio general: **institucional sobrio, minimalista, sin adornos**. Fondo neutro cálido, un solo acento azul apagado, jerarquía por tamaño y peso — no por color ni por cajas de más.

---

## 1. Tipografía

Una sola familia en todo el producto:

```
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
```

- Sin fuentes externas, sin monoespaciada. Los números usan `font-variant-numeric: tabular-nums` (declarado una vez en el reset del `body`) para que las columnas alineen.
- Pesos: **400** (texto), **500** (títulos, labels, botones, cifras). No usar 600+.

| Rol | Tamaño / peso | Notas |
|---|---|---|
| Título de pantalla (h1) | 26px / 500, `letter-spacing:-.015em` | Uno por pantalla |
| Bajada del título | 13.5px / 400, `#6b6f76` | Una línea, explica la regla del módulo |
| Título de sección | 13px / 500, `#6b6f76` | Caja normal |
| Título de card | 15–18px / 500, `line-height:1.3` | |
| Cifra destacada | 22–44px / 500, `letter-spacing:-.025em`, `white-space:nowrap` | |
| Cuerpo | 13–14px / 400, `line-height:1.6` | `max-width:62ch`, `text-wrap:pretty` |
| Label de campo | 12.5px / 500, `#4c5057` | |
| Meta / auxiliar | 11.5–12px / 400, `#8a8e95` | |

**Prohibido: eyebrows.** Nada de labels en versalitas con `text-transform:uppercase` + `letter-spacing`. Las etiquetas van en caja normal, 12–13px. La única excepción son los chips, y tampoco llevan mayúsculas forzadas.

---

## 2. Color

| Token | Variable CSS | Hex | Uso |
|---|---|---|---|
| Fondo app | `--fondo` | `#f4f4f1` | Lienzo |
| Superficie | `--superficie` | `#ffffff` | Cards, tablas, header |
| Superficie sutil | `--superficie-sutil` | `#fbfbf9` | Encabezados de tabla, sidebar, footers de modal |
| Línea | `--linea` · `--linea-fuerte` · `--linea-fila` | `#e6e4de` · `#eeece7` · `#f2f0eb` | Borde de card · divisor fuerte · divisor de fila |
| Tinta | `--tinta` | `#16171a` | Texto principal |
| Tinta media | `--tinta-media` / `--tinta-secundaria` | `#4c5057` / `#6b6f76` | Cuerpo y secundario |
| Tinta suave | `--tinta-suave` / `--tinta-tenue` | `#8a8e95` / `#a3a7ad` | Meta y placeholders |
| Acento | `--acento` | `#2f3f52` | Botones primarios, links, valores activos |
| Acento profundo | `--acento-profundo` | `#22303f` | Paneles oscuros, hover del primario |
| Acento claro | `--acento-claro` | `#eef1f4` | Fondo de estado activo (nav, chips, tabs) |
| Éxito | `--exito` / `--exito-fondo` | `#3f6b52` sobre `#eef3ee` | Gratuito, asistió, validado, saldo positivo |
| Atención | `--atencion` / `--atencion-fondo` | `#8a6a2f` sobre `#faf5ea` | Últimos lugares, lista de espera |
| Error | `--error` / `--error-fuerte` / `--error-fondo` / `--error-linea` | `#8c4a45` / `#a8503f` sobre `#fdf6f5`, borde `#e3cdc9` | Conflictos, saldo insuficiente, acciones destructivas |

Máximo dos fondos por pantalla (claro + un panel `#22303f` cuando hace falta jerarquía). Nada de gradientes.

---

## 3. Forma y espacio

- Radios: **8–9px** controles, **12–14px** cards, **16–17px** contenedores hero, **20px** chips/pills, **50%** avatares.
- Bordes: `1px solid #e6e4de`. Sombras casi ausentes: `0 1px 2px rgba(20,22,26,.05)` en superficies encastradas, `0 6px 20px rgba(20,22,26,.06)` sólo en hover de card clickeable, `0 24px 60px rgba(20,22,26,.24)` en modales.
- Padding: 17–20px cards compactas, 22–28px cards principales, 30px 34px el `main`.
- Grillas y filas **siempre** con `display:flex/grid` + `gap` (nunca márgenes sueltos). Gaps: 8px intra-grupo, 14–16px entre cards, 22–24px entre columnas, 30px 34px del layout.
- Ancho de contenido: `max-width:1160px` centrado.

**Regla anti-desborde (importante):** ninguna grilla con columnas fijas que sumen más que el ancho útil. Usar `repeat(auto-fit,minmax(Xpx,1fr))` o `flex-wrap` para que colapse, `minmax(0,1fr)` en la columna elástica, y `white-space:nowrap` en cifras, códigos y textos de botón.

---

## 4. Shell de la aplicación

- **Header** 60px, `#fff`, borde inferior: wordmark `UADEnet` (14px/500, `letter-spacing:.14em`) · selector de **sede** (presente en todas las pantallas) · campana con punto `#a8503f` · botón de usuario (avatar, nombre, mail y chevron) que abre el menú de sesión con **Cerrar sesión**. El perfil **no** se cambia desde el header: sale de la sesión del usuario logueado y se muestra al tope del sidebar.
- **Sidebar** 222px, `#fbfbf9`: nombre del perfil arriba, ítems de 13px con estado activo `background:#eef1f4;color:#22303f;font-weight:500`, badges numéricos en pill gris (o rojiza para "live"), y una tarjeta de saldo institucional al pie.
- **Main**: título → bajada → filtros/tabs → contenido, separados por `gap:24px`.

Implementado en `apps/web/components/shell/app-shell.tsx`.

---

## 5. Componentes

**Botones** (`components/ui/boton.tsx`)
- Primario: `padding:11px 17px; background:#2f3f52; color:#fff; border:0; radius:9px; 13px/500`, hover `#22303f`.
- Secundario: `1px solid #e2dfd8; background:#fff; color:#2f3f52`, hover `#f1f4f7`.
- Destructivo: secundario con `color:#8c4a45`, hover `#fbf5f4` + borde `#e3cdc9`.
- Deshabilitado: `background:#e6e4de; color:#a3a7ad; cursor:not-allowed`.
- Siempre `white-space:nowrap`; los grupos con `display:flex; gap:9px; flex-wrap:wrap`.

**Chips y filtros** (`components/ui/controles.tsx`)
- Filtro pill: `radius:20px; padding:7px 13px; 12px/500`; activo `background:#22303f; color:#fff`.
- Segmented control: contenedor `#fff` con borde y `padding:3px`; activo `background:#eef1f4; color:#22303f`.
- Badge de estado: `radius:20px; padding:3px 9px; 11.5px/500` con el par color/fondo de la paleta semántica.

**Campos** (`components/ui/campo.tsx`)
`border:1px solid #dedbd4; radius:9px; padding:11px 13px; 14px/400; outline:none`. Label arriba a 12.5px/500. En error, borde `#d9b3ad` y fondo `#fdf6f5`.

**Dropdowns** (`components/ui/select.tsx` → `Select`)
Siempre custom: **no se usa `<select>` nativo**, porque la lista de opciones la dibuja el sistema operativo y se sale del sistema de diseño. El disparador es un botón que toma el borde, el fondo y la tipografía del contexto (`claseControl` en formularios, el control chico del header) y agrega el chevron; la lista es una tarjeta blanca `radius:12px; padding:5px` con `box-shadow:0 18px 44px rgba(20,22,26,.14)`, opciones de 13px con hover `#fbfbf9` y la elegida en `#eef1f4`/`#22303f`. Cierra con click afuera, con Escape y al elegir; se recorre con flechas.

**Cards de datos** (`components/ui/pantalla.tsx` → `Datacards`)
Tarjeta blanca `1px solid #e6e4de; radius:14px; padding:22px 20px` con `box-shadow:0 1px 2px rgba(20,22,26,.05)` y `gap:7px`. Tres líneas en orden: label (13px `#8a8e95`), cifra (27px/500, `letter-spacing:-.03em`, `white-space:nowrap`) y subtexto (11.5px `#a3a7ad`). Sin bandeja, sin escalón gris y sin pill de delta: la card muestra el valor, no su variación.

**Tablas**
Encabezado `#fbfbf9`, 12px/500 `#8a8e95`, caja normal. Filas 14px 18px con divisor `#f2f0eb` y hover `#fbfbf9`. Columna de texto `minmax(160px,1fr)`; contenedor con `overflow:auto` y la fila con `min-width` cuando hay muchas columnas.

**Listas y feeds**
Card con riel de 4px a la izquierda (acento `#4a5f78` si está sin leer) + contenido. Agrupar por encabezado de sección con línea a la derecha (`Hoy`, `Esta semana`, `Antes`; meses en el ledger).

**Panel oscuro**
`#22303f`, texto `#fff`, secundario `#b6c3ce`, terciario `#7d8d9b`, divisores `rgba(255,255,255,.14)`. Para saldos, credenciales, escáner y bloques de fecha.

**Modales** (`components/ui/modal.tsx`)
Overlay `rgba(20,22,26,.34)`; caja `max-width:496px`, `radius:16px`; header con título, cuerpo, y footer `#fbfbf9` con acciones a la derecha. Confirmaciones destructivas y de pago siempre en modal.

**Popover** (`components/shell/panel-avisos.tsx`)
Tarjeta blanca `radius:14px` anclada al header, `box-shadow:0 18px 44px rgba(20,22,26,.14)`. **Sin overlay**: el popover flota por sombra y no oscurece la pantalla — el backdrop es exclusivo de los modales. Cierra con click afuera, con Escape o con su propio disparador.

**Toast** (`components/ui/toast.tsx`)
Fijo abajo centrado, `#22303f`, `radius:10px`, 13px, se va solo a los 2,6s.

---

## 6. Movimiento

El movimiento no decora: da feedback, indica estado o evita que algo aparezca de golpe. Si una animación no cumple ninguna de las tres, no va.

### 6.1 Curvas y duraciones

Tokens en `globals.css`. Las curvas del browser son flojas — usar estas, nunca `ease-in` en UI (arranca lento justo cuando el usuario está mirando).

| Token | Valor | Cuándo |
|---|---|---|
| `--ease-salida` | `cubic-bezier(.23,1,.32,1)` | Todo lo que entra o responde a un click (default) |
| `--ease-transicion` | `cubic-bezier(.77,0,.175,1)` | Algo que se mueve de un lugar a otro en pantalla |
| `--ease-rebote` | `cubic-bezier(.34,1.56,.64,1)` | Sólo en momentos de celebración (el tilde del modal de confirmación) |
| `--duracion-presion` | `140ms` | Feedback de presión |
| `--duracion-color` | `130ms` | Hover, foco, cambios de color |
| `--duracion-flotante` | `180ms` | Popovers, dropdowns, menús |

Techo duro: **300ms** en cualquier animación de UI. Los cambios de color y el hover van con `ease` a `--duracion-color`.

### 6.2 Reglas

- **Todo lo clickeable baja de escala al presionarse:** `transform: scale(.97)` (`.98`–`.99` en superficies grandes como cards o filas). Es lo que hace que la interfaz se sienta viva.
- **Nada entra desde `scale(0)`.** Los flotantes entran desde `scale(.97)` con opacidad — en el mundo real nada aparece de la nada.
- **Los flotantes escalan desde su disparador**, con `transform-origin` apuntando al ancla (`top left` en el dropdown de sede, `top right` en el panel de avisos y el menú de usuario). El modal es la excepción: no está anclado a nada, entra centrado.
- **Sólo se animan `transform` y `opacity`** (más colores y `box-shadow`, que son baratos). Nada de animar `height`, `margin` ni `padding`. La única excepción es el `width` de la barra de cupo: es un elemento de 4px y con `scaleX` se deforma el radio.
- **Hover sólo donde hay puntero real:** si el hover mueve algo, va dentro de `@media (hover:hover) and (pointer:fine)`, porque en touch el estado queda pegado.
- **Cuidado con `animation-fill-mode: both`**: deja fijo el estado final del keyframe y le gana a cualquier `transform` de hover sobre el mismo elemento.
- Nada de parallax ni entradas escalonadas: las listas se ven decenas de veces por día y el stagger las vuelve lentas.

### 6.3 Keyframes disponibles

```css
@keyframes riseIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }      /* .2–.28s, contenido que aparece */
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }                                              /* .16s, overlay de modal */
@keyframes popIn    { from{opacity:0;transform:scale(.97) translateY(-4px)} to{...} }              /* .18s, flotantes anclados */
@keyframes modalIn  { from{opacity:0;transform:scale(.97) translateY(6px)} to{...} }               /* .22s, caja del modal */
@keyframes toastIn  { /* conserva el translateX(-50%) del centrado */ }                             /* .24s */
@keyframes tildeIn  { from{transform:scale(.7)} to{transform:scale(1)} }                            /* .32s con rebote */
@keyframes pulseRing{ /* halo del escáner de asistencia */ }
```

### 6.4 Movimiento reducido

`prefers-reduced-motion: reduce` **no** apaga todo: mata las animaciones y las transiciones de `transform`, y conserva las de opacidad, color y sombra, que son las que explican qué cambió.

---

## 7. Copy

- Español rioplatense, voseo (`Usá tu cuenta institucional`, `Liberá tu lugar`).
- Frases cortas y concretas; los subtítulos explican la **regla del sistema**, no la pantalla ("No se puede reservar la misma locación para dos eventos concurrentes").
- Los errores dicen qué pasó y ofrecen salida (alternativas de horario, cargar saldo, cambiar de evento).
- Sin emoji. Sin signos de admiración.
- Montos siempre `$ 12.500` (espacio después del signo, punto de miles). Horarios `09:00–13:00`. Fechas largas en minúscula: `12 de septiembre`.

---

## 8. Patrones transversales

1. **Sede** es un filtro de primer nivel, presente en el header de toda pantalla.
2. **Perfiles**: administrativo, docente, estudiante. Misma shell, distinta navegación y permisos; nunca pantallas duplicadas. El perfil lo define la sesión del usuario logueado y no se cambia desde la UI: para ver otra vista hay que entrar con otra cuenta.
3. **Conflictos**: se detectan antes de confirmar, se muestran inline con contexto visual (timeline de ocupación) y siempre con alternativas sugeridas. El botón de confirmar queda deshabilitado hasta resolverlos.
4. **Dinero**: todo se descuenta de la cuenta institucional; se muestra el saldo antes y después de la operación antes de confirmar.
5. **Avisos**: mail institucional + centro en el portal, misma copy; la regla automática se documenta en la pantalla (timeline T−7 / T−24h / día del evento).
6. **Estados vacíos**: card con borde punteado `#ddd9d1`, una frase y una acción primaria.
