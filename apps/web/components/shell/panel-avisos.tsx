"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";

import { AVISOS } from "@/lib/mock/avisos";
import { useSesion } from "@/lib/sesion";

import estilos from "./panel-avisos.module.css";

export function PanelAvisos({
  onCerrar,
  disparador,
}: {
  onCerrar: () => void;
  disparador: RefObject<HTMLElement | null>;
}) {
  const { avisosLeidos, avisosDescartados } = useSesion();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alSoltarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    // Sin backdrop que reciba el click, el cierre por "afuera" lo detecta el
    // documento; el disparador se excluye para que su toggle no lo reabra.
    const alApretarAfuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (panel.current?.contains(destino)) return;
      if (disparador.current?.contains(destino)) return;
      onCerrar();
    };
    document.addEventListener("keydown", alSoltarTecla);
    document.addEventListener("pointerdown", alApretarAfuera);
    return () => {
      document.removeEventListener("keydown", alSoltarTecla);
      document.removeEventListener("pointerdown", alApretarAfuera);
    };
  }, [onCerrar, disparador]);
  const visibles = AVISOS.filter(
    (aviso) => !avisosDescartados.includes(aviso.id),
  ).slice(0, 4);

  return (
    <div
      ref={panel}
      className={estilos.panel}
      role="dialog"
      aria-label="Avisos"
    >
      <div className={estilos.header}>
        <span className={estilos.headerTitulo}>Avisos</span>
        <Link href="/avisos" className={estilos.verTodos} onClick={onCerrar}>
          Ver todos
        </Link>
      </div>
      {visibles.map((aviso) => (
        <div key={aviso.id} className={estilos.item}>
          <span
            className={`${estilos.punto} ${
              aviso.sinLeer && !avisosLeidos ? estilos.puntoSinLeer : ""
            }`}
          />
          <div className={estilos.itemTextos}>
            <div className={estilos.itemFila}>
              <span className={estilos.itemTitulo}>{aviso.titulo}</span>
              <span className={estilos.itemCuando}>{aviso.cuando}</span>
            </div>
            <span className={estilos.itemTexto}>{aviso.texto}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
