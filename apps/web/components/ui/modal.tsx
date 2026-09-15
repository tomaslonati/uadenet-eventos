"use client";

import { useEffect, type ReactNode } from "react";

import estilos from "./modal.module.css";

export function Modal({
  etiqueta,
  onCerrar,
  children,
}: {
  etiqueta: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const alSoltarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alSoltarTecla);
    return () => document.removeEventListener("keydown", alSoltarTecla);
  }, [onCerrar]);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        className={estilos.overlay}
        onClick={onCerrar}
      />
      <div className={estilos.contenedor}>
        <div className={estilos.caja} role="dialog" aria-modal aria-label={etiqueta}>
          {children}
        </div>
      </div>
    </>
  );
}

export function ModalHeader({
  etiqueta,
  titulo,
}: {
  etiqueta?: string;
  titulo: string;
}) {
  return (
    <div className={estilos.header}>
      {etiqueta ? <span className={estilos.headerEtiqueta}>{etiqueta}</span> : null}
      <span className={estilos.headerTitulo}>{titulo}</span>
    </div>
  );
}

export function ModalCuerpo({ children }: { children: ReactNode }) {
  return <div className={estilos.cuerpo}>{children}</div>;
}

export function ModalPie({
  centrado = false,
  children,
}: {
  centrado?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${estilos.pie} ${centrado ? estilos.pieCentrado : ""}`}>
      {children}
    </div>
  );
}

export function ModalConfirmacion({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <div className={estilos.confirmacion}>
      <div className={estilos.tilde} aria-hidden>
        <span />
      </div>
      <span className={estilos.confirmacionTitulo}>{titulo}</span>
      <p className={estilos.confirmacionTexto}>{texto}</p>
    </div>
  );
}
