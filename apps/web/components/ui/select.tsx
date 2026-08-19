"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import estilos from "./select.module.css";

type Caja = { top: number; left: number; ancho: number };

export function Select({
  id,
  etiqueta,
  valor,
  opciones,
  onCambiar,
  className,
}: {
  id?: string;
  etiqueta: string;
  valor: string;
  opciones: readonly string[];
  onCambiar: (valor: string) => void;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // La lista va con position fixed y coordenadas medidas: el header tiene
  // overflow hidden y clipearía una lista absoluta.
  const medir = useCallback(() => {
    const rect = disparador.current?.getBoundingClientRect();
    if (rect) {
      setCaja({ top: rect.bottom + 6, left: rect.left, ancho: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!abierto) return;
    medir();
    const alApretarAfuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("pointerdown", alApretarAfuera);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      document.removeEventListener("pointerdown", alApretarAfuera);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [abierto, medir]);

  useEffect(() => {
    if (abierto) items.current[activo]?.focus();
  }, [abierto, activo]);

  const abrir = () => {
    const indice = opciones.indexOf(valor);
    setActivo(indice < 0 ? 0 : indice);
    setAbierto(true);
  };

  const elegir = (opcion: string) => {
    onCambiar(opcion);
    setAbierto(false);
    disparador.current?.focus();
  };

  const enTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape" && abierto) {
      setAbierto(false);
      disparador.current?.focus();
      return;
    }
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    evento.preventDefault();
    if (!abierto) {
      abrir();
      return;
    }
    const paso = evento.key === "ArrowDown" ? 1 : -1;
    setActivo((indice) => (indice + paso + opciones.length) % opciones.length);
  };

  return (
    <div
      ref={contenedor}
      className={estilos.select}
      onKeyDown={enTecla}
      onBlur={(evento) => {
        if (!contenedor.current?.contains(evento.relatedTarget)) {
          setAbierto(false);
        }
      }}
    >
      <button
        ref={disparador}
        id={id}
        type="button"
        className={`${estilos.disparador} ${className ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
      >
        <span className={estilos.valor}>{valor}</span>
        <span className={estilos.flecha} aria-hidden />
      </button>

      {abierto && caja ? (
        <div
          className={estilos.lista}
          role="listbox"
          aria-label={etiqueta}
          style={{ top: caja.top, left: caja.left, minWidth: caja.ancho }}
        >
          {opciones.map((opcion, indice) => (
            <button
              key={opcion}
              ref={(nodo) => {
                items.current[indice] = nodo;
              }}
              type="button"
              role="option"
              aria-selected={opcion === valor}
              className={`${estilos.opcion} ${
                opcion === valor ? estilos.elegida : ""
              }`}
              onClick={() => elegir(opcion)}
            >
              {opcion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
