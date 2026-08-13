import { useId, type ReactNode } from "react";

import estilos from "./campo.module.css";

export function Campo({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={estilos.campo}>
      <label className={estilos.label} htmlFor={id}>
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export const claseControl = estilos.control;
export const claseControlError = `${estilos.control} ${estilos.enError}`;
export const claseSoloLectura = `${estilos.control} ${estilos.soloLectura}`;
