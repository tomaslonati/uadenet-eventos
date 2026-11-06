import type { ReactNode } from "react";

import type { Tono } from "@/lib/dominio";

import estilos from "./badge.module.css";

export function Badge({
  tono = "neutro",
  className,
  children,
}: {
  tono?: Tono | "acento";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`${estilos.badge} ${estilos[tono]} ${className ?? ""}`.trim()}
    >
      {children}
    </span>
  );
}
