"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AVISOS } from "@/lib/mock/avisos";
import { useSesion } from "@/lib/sesion";

import estilos from "./panel-avisos.module.css";

export function PanelAvisos({ onCerrar }: { onCerrar: () => void }) {
  const { avisosLeidos, avisosDescartados } = useSesion();

  useEffect(() => {
    const alSoltarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alSoltarTecla);
    return () => document.removeEventListener("keydown", alSoltarTecla);
  }, [onCerrar]);
  const visibles = AVISOS.filter(
    (aviso) => !avisosDescartados.includes(aviso.id),
  ).slice(0, 4);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar avisos"
        className={estilos.overlay}
        onClick={onCerrar}
      />
      <div className={estilos.panel} role="dialog" aria-label="Avisos">
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
    </>
  );
}
