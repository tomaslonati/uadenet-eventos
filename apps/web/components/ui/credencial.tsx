import { celdasCredencial } from "@/lib/qr";

import estilos from "./credencial.module.css";

/** Representación visual de la credencial digital. El código real lo emite la API. */
export function Credencial({
  semilla,
  codigo,
  tamano = "grande",
}: {
  semilla: number;
  codigo: string;
  tamano?: "grande" | "chica";
}) {
  return (
    <div
      className={`${estilos.credencial} ${estilos[tamano]}`}
      role="img"
      aria-label={`Credencial digital ${codigo}`}
    >
      {celdasCredencial(semilla).map((encendida, indice) => (
        <div
          // Las celdas no tienen identidad propia: la posición es la clave.
          key={indice}
          className={encendida ? estilos.encendida : undefined}
        />
      ))}
    </div>
  );
}
