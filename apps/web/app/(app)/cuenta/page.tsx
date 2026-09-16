"use client";

import { Encabezado } from "@/components/ui/pantalla";
import { pesos } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./cuenta.module.css";

export default function Cuenta() {
  const { saldo, usuario } = useSesion();

  return (
    <>
      <Encabezado
        titulo="Cuenta institucional"
        bajada="Las inscripciones pagas se descuentan de este saldo. El historial de movimientos y la carga de saldo se gestionan desde tu cuenta institucional de CORE."
      />

      <section className={estilos.resumen}>
        <div className={estilos.saldo}>
          <span className={estilos.saldoLabel}>Saldo disponible</span>
          <span className={estilos.saldoMonto}>{pesos(saldo)}</span>
          <span className={estilos.saldoId}>{usuario.mail}</span>
        </div>
      </section>
    </>
  );
}
