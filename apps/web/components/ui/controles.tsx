"use client";

import estilos from "./controles.module.css";

export function ChipsFiltro<T extends string>({
  opciones,
  activa,
  onCambio,
}: {
  opciones: readonly T[];
  activa: T;
  onCambio: (opcion: T) => void;
}) {
  return (
    <div className={estilos.filtros}>
      {opciones.map((opcion) => (
        <button
          key={opcion}
          type="button"
          aria-pressed={opcion === activa}
          className={`${estilos.chip} ${opcion === activa ? estilos.chipActivo : ""}`}
          onClick={() => onCambio(opcion)}
        >
          {opcion}
        </button>
      ))}
    </div>
  );
}

export function Segmentado<T extends string>({
  opciones,
  activa,
  onCambio,
  expandido = false,
  etiqueta,
}: {
  opciones: readonly { valor: T; label: string }[];
  activa: T;
  onCambio: (valor: T) => void;
  expandido?: boolean;
  etiqueta?: string;
}) {
  return (
    <div className={estilos.segmentado} role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={opcion.valor === activa}
          className={[
            estilos.segmento,
            opcion.valor === activa ? estilos.segmentoActivo : "",
            expandido ? estilos.segmentoExpandido : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onCambio(opcion.valor)}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}

export function BarraCupo({
  porcentaje,
  alta = false,
}: {
  porcentaje: number;
  alta?: boolean;
}) {
  return (
    <div className={`${estilos.barra} ${alta ? estilos.barraAlta : ""}`}>
      <div
        className={`${estilos.relleno} ${porcentaje >= 100 ? estilos.rellenoCompleto : ""}`}
        style={{ width: `${Math.min(porcentaje, 100)}%` }}
      />
    </div>
  );
}

export function Cupo({
  texto,
  porcentaje,
  alta = false,
}: {
  texto: string;
  porcentaje: number;
  alta?: boolean;
}) {
  return (
    <div className={estilos.cupo}>
      <div className={estilos.cupoLeyenda}>
        <span>{texto}</span>
        <span>{porcentaje}%</span>
      </div>
      <BarraCupo porcentaje={porcentaje} alta={alta} />
    </div>
  );
}
