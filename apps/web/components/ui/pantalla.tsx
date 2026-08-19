import type { ReactNode } from "react";

import estilos from "./pantalla.module.css";

export function Encabezado({
  antetitulo,
  titulo,
  bajada,
  accion,
}: {
  antetitulo?: string;
  titulo: string;
  bajada?: string;
  accion?: ReactNode;
}) {
  return (
    <div className={estilos.encabezado}>
      <div className={estilos.encabezadoTextos}>
        {antetitulo ? <span className={estilos.antetitulo}>{antetitulo}</span> : null}
        <h1 className={estilos.titulo}>{titulo}</h1>
        {bajada ? <p className={estilos.bajada}>{bajada}</p> : null}
      </div>
      {accion ? <div className={estilos.accion}>{accion}</div> : null}
    </div>
  );
}

export function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className={estilos.seccion}>
      <span className={estilos.tituloSeccion}>{titulo}</span>
      {children}
    </section>
  );
}

export function SeparadorSeccion({
  label,
  derecha,
}: {
  label: string;
  derecha?: ReactNode;
}) {
  return (
    <div className={estilos.separadorSeccion}>
      <span className={estilos.tituloSeccion}>{label}</span>
      <span className={estilos.regla} />
      {derecha}
    </div>
  );
}

export function EstadoVacio({
  texto,
  accion,
}: {
  texto: string;
  accion?: ReactNode;
}) {
  return (
    <div className={estilos.vacio}>
      <span className={estilos.vacioTexto}>{texto}</span>
      {accion}
    </div>
  );
}

export type Indicador = {
  label: string;
  valor: string;
  sub: string;
};

export function Datacards({ indicadores }: { indicadores: Indicador[] }) {
  return (
    <div className={estilos.datacards}>
      {indicadores.map((indicador) => (
        <div key={indicador.label} className={estilos.datacard}>
          <span className={estilos.datacardLabel}>{indicador.label}</span>
          <span className={estilos.cifra}>{indicador.valor}</span>
          <span className={estilos.datacardSub}>{indicador.sub}</span>
        </div>
      ))}
    </div>
  );
}
