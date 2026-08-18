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
| Bandeja | `--bandeja` | `#edece7` | Fondo de las datacards encastradas |
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

- **Header** 60px, `#fff`, borde inferior: wordmark `UADEnet` (14px/500, `letter-spacing:.14em`) · selector de **sede** (presente en todas las pantallas) · switch de perfil · campana con punto `#a8503f` · usuario · Salir.
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

**Cards de datos** (`components/ui/pantalla.tsx` → `Datacards`)
Bandeja `#edece7` con `radius:17px; padding:5px`; adentro una tarjeta blanca `radius:13px; padding:22px 20px` con la cifra (27px/500) y su delta en pill; el label y el subtexto van en el escalón gris inferior (`padding:11px 18px 12px`, 13px `#7c7f85` + 11.5px `#a3a7ad`).

**Tablas**
Encabezado `#fbfbf9`, 12px/500 `#8a8e95`, caja normal. Filas 14px 18px con divisor `#f2f0eb` y hover `#fbfbf9`. Columna de texto `minmax(160px,1fr)`; contenedor con `overflow:auto` y la fila con `min-width` cuando hay muchas columnas.

**Listas y feeds**
Card con riel de 4px a la izquierda (acento `#4a5f78` si está sin leer) + contenido. Agrupar por encabezado de sección con línea a la derecha (`Hoy`, `Esta semana`, `Antes`; meses en el ledger).

**Panel oscuro**
`#22303f`, texto `#fff`, secundario `#b6c3ce`, terciario `#7d8d9b`, divisores `rgba(255,255,255,.14)`. Para saldos, credenciales, escáner y bloques de fecha.

**Modales** (`components/ui/modal.tsx`)
Overlay `rgba(20,22,26,.34)`; caja `max-width:496px`, `radius:16px`; header con título, cuerpo, y footer `#fbfbf9` con acciones a la derecha. Confirmaciones destructivas y de pago siempre en modal.

**Toast** (`components/ui/toast.tsx`)
Fijo abajo centrado, `#22303f`, `radius:10px`, 13px, se va solo a los 2,6s.

---

## 6. Movimiento

Sólo tres animaciones, suaves y cortas, declaradas en `globals.css`:

```css
@keyframes riseIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }  /* .2–.28s */
@keyframes fadeIn { from{opacity:0} to{opacity:1} }                                            /* .16s */
@keyframes pulseRing { /* halo del escáner de asistencia */ }
```

Transiciones de hover instantáneas (sin `transition` larga). Nada de parallax ni entradas escalonadas.

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
2. **Perfiles**: administrativo, docente, estudiante. Misma shell, distinta navegación y permisos; nunca pantallas duplicadas.
3. **Conflictos**: se detectan antes de confirmar, se muestran inline con contexto visual (timeline de ocupación) y siempre con alternativas sugeridas. El botón de confirmar queda deshabilitado hasta resolverlos.
4. **Dinero**: todo se descuenta de la cuenta institucional; se muestra el saldo antes y después de la operación antes de confirmar.
5. **Avisos**: mail institucional + centro en el portal, misma copy; la regla automática se documenta en la pantalla (timeline T−7 / T−24h / día del evento).
6. **Estados vacíos**: card con borde punteado `#ddd9d1`, una frase y una acción primaria.
