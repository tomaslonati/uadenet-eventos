import type { ReactNode } from "react";

import type { Tono } from "@/lib/dominio";

import estilos from "./badge.module.css";

export function Badge({
  tono = "neutro",
  children,
}: {
  tono?: Tono | "acento";
  children: ReactNode;
}) {
  return <span className={`${estilos.badge} ${estilos[tono]}`}>{children}</span>;
}
