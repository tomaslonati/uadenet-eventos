import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import estilos from "./boton.module.css";

type Variante = "primario" | "secundario" | "destructivo" | "claro";
type Tamano = "md" | "sm" | "xs";

type Apariencia = {
  variante?: Variante;
  tamano?: Tamano;
  bloque?: boolean;
};

function clases({
  variante = "secundario",
  tamano = "md",
  bloque,
}: Apariencia): string {
  return [
    estilos.boton,
    estilos[variante],
    estilos[tamano],
    bloque ? estilos.bloque : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type BotonProps = Apariencia &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Boton({
  variante,
  tamano,
  bloque,
  children,
  type = "button",
  ...resto
}: BotonProps) {
  return (
    <button
      type={type}
      className={clases({ variante, tamano, bloque })}
      {...resto}
    >
      {children}
    </button>
  );
}

type BotonLinkProps = Apariencia & { href: string; children: ReactNode };

export function BotonLink({
  variante,
  tamano,
  bloque,
  children,
  href,
}: BotonLinkProps) {
  return (
    <Link href={href} className={clases({ variante, tamano, bloque })}>
      {children}
    </Link>
  );
}

export function GrupoBotones({ children }: { children: ReactNode }) {
  return <div className={estilos.grupo}>{children}</div>;
}
