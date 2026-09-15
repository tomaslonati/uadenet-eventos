# 0010 — Estilos del frontend: CSS Modules + tokens propios

## Contexto

Hay que implementar las pantallas del módulo (cartelera, detalle, alta de evento, mis inscripciones, cuenta, gestión, asistencia, avisos) a partir del prototipo de diseño. El sistema de diseño está cerrado y es chico: una sola tipografía, una paleta acotada, tres animaciones (ver `../03-diseno/sistema-diseno.md`). No hay diseñador dedicado ni intención de armar una librería de componentes reutilizable fuera de este repo.

## Opciones consideradas

- **Tailwind CSS** — rápido para prototipar, pero suma una dependencia y un pipeline nuevos, y su escala por defecto (spacing, radios, colores) no coincide con la del sistema de diseño: habría que reconfigurarla entera para después usar solo clases arbitrarias.
- **Librería de componentes (shadcn/ui, MUI)** — traen su propio lenguaje visual y su propia paleta. Acá el diseño ya está definido y es deliberadamente sobrio: pelear contra los defaults cuesta más que escribir el CSS.
- **Estilos inline** — es como viene el prototipo. No escala: no hay `:hover`, ni media queries, ni forma de compartir un valor entre pantallas.
- **CSS Modules + variables CSS** — viene incluido en Next.js, cero dependencias, alcance local por archivo, y las variables CSS son el lugar natural para los tokens del sistema de diseño.

## Decisión

**CSS Modules colocados junto al componente o la ruta que estilan, con los tokens del sistema de diseño como variables CSS en `apps/web/app/globals.css`.**

- `globals.css` sólo tiene tokens, reset y los tres `@keyframes`. Nada de clases de utilidad globales.
- Un `.module.css` por componente o por ruta, al lado del `.tsx`.
- Los valores duros (hex, tamaños de fuente) van en los tokens; un componente que necesita un color escribe `var(--acento)`, no `#2f3f52`.
- Lo que se repite entre pantallas se resuelve con un componente en `components/ui/`, no copiando CSS.

## Motivo

El sistema de diseño es cerrado y chico: el costo de escribir el CSS a mano es menor al de configurar y después domar un framework para que produzca exactamente estos valores. Además mantiene el `package.json` del frontend con cero dependencias de estilos, que es lo que corresponde para la escala de este TP.

## Consecuencias

- Si más adelante aparece un caso que justifique Tailwind (por ejemplo, compartir UI con otro módulo del TP), la migración es acotada: los tokens ya están centralizados en un solo archivo.
- Nadie escribe estilos inline en un `.tsx` salvo valores calculados en runtime (ancho de una barra de progreso, posición de un bloque en la timeline de ocupación).
