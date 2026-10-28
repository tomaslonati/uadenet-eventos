"use client";

import { useCallback, useEffect, useState } from "react";

import { Boton } from "@/components/ui/boton";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import {
  fetchMovimientosWalletApi,
  recargarSaldoApi,
  type MovimientoWalletApi,
} from "@/lib/api";
import { fechaCorta, pesos } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./cuenta.module.css";

const MONTOS_RECARGA = [5_000, 10_000, 20_000];

const ETIQUETA_CONCEPTO: Record<string, string> = {
  TOP_UP: "Carga de saldo institucional",
  EVENT_REGISTRATION: "Inscripción a evento académico",
  REFUND: "Reintegro de operación",
  DINING_RESERVATION: "Reserva de comedor",
  STORE_PURCHASE: "Compra en tienda universitaria",
  LIBRARY_FINE: "Arancel de biblioteca",
  SCHOLARSHIP: "Beca institucional",
  PAYROLL: "Acreditación institucional",
  ADJUSTMENT: "Ajuste contable",
};

export default function Cuenta() {
  const {
    saldo,
    usuario,
    accessToken,
    refrescarSaldo,
    mostrarToast,
  } = useSesion();
  const [movimientos, setMovimientos] = useState<MovimientoWalletApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [montoElegido, setMontoElegido] = useState<number>(MONTOS_RECARGA[0]!);
  const [recargando, setRecargando] = useState(false);

  const recargarMovimientos = useCallback(async () => {
    const items = await fetchMovimientosWalletApi(accessToken);
    setMovimientos(items);
  }, [accessToken]);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const items = await fetchMovimientosWalletApi(accessToken);
        if (!cancelado) setMovimientos(items);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [accessToken]);

  const acreditar = async () => {
    if (recargando) return;
    setRecargando(true);
    try {
      await recargarSaldoApi(montoElegido, accessToken);
      await Promise.all([refrescarSaldo(), recargarMovimientos()]);
      mostrarToast(`Se acreditaron ${pesos(montoElegido)} en tu billetera CORE.`);
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo recargar saldo en CORE.",
      );
    } finally {
      setRecargando(false);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Cuenta institucional"
        bajada="Billetera sincronizada en tiempo real con CORE (/api/v1/wallets/me). Las inscripciones aranceladas descuentan saldo con clave de idempotencia."
      />

      <section className={estilos.resumen}>
        <div className={estilos.saldo}>
          <span className={estilos.saldoLabel}>Saldo disponible en CORE</span>
          <span className={estilos.saldoMonto}>{pesos(saldo)}</span>
          <span className={estilos.saldoId}>{usuario.mail}</span>
        </div>
        <div className={estilos.stat}>
          <span className={estilos.statClave}>Movimientos registrados</span>
          <span className={estilos.statValor}>{movimientos.length}</span>
          <span className={estilos.statSub}>
            Consultados en vivo desde GET /api/v1/wallets/me/transactions
          </span>
        </div>
      </section>

      <div className={estilos.columnas}>
        <section className={estilos.movimientos}>
          <div className={estilos.movimientosHeader}>
            <span className={estilos.movimientosTitulo}>
              Historial de movimientos
            </span>
          </div>

          {cargando && movimientos.length === 0 ? (
            <EstadoVacio texto="Consultando movimientos en CORE…" />
          ) : movimientos.length === 0 ? (
            <EstadoVacio texto="Todavía no registrás movimientos en tu billetera institucional." />
          ) : (
            <div className={estilos.lista}>
              {movimientos.map((tx) => {
                const esIngreso = tx.type === "CREDIT" || tx.type === "REVERSAL";
                const montoNum = Number.parseFloat(tx.amount) || 0;
                const fechaIso = tx.createdAt.slice(0, 10);
                return (
                  <div key={tx.transactionId} className={estilos.fila}>
                    <span
                      className={`${estilos.icono} ${
                        esIngreso ? estilos.iconoIngreso : ""
                      }`}
                      aria-hidden
                    />
                    <span className={estilos.filaDatos}>
                      <span className={estilos.concepto}>
                        {ETIQUETA_CONCEPTO[tx.concept] ?? tx.concept}
                      </span>
                      <span className={estilos.detalle}>
                        {fechaCorta(fechaIso)} · {tx.status} · ref{" "}
                        {tx.externalReference.slice(0, 18)}
                      </span>
                    </span>
                    <span
                      className={`${estilos.monto} ${
                        esIngreso ? estilos.montoIngreso : ""
                      }`}
                    >
                      {esIngreso ? "+" : "−"}
                      {pesos(montoNum)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className={estilos.lateral}>
          <div className={estilos.panel}>
            <span className={estilos.panelTitulo}>Cargar saldo en CORE</span>
            <p className={estilos.panelBajada}>
              Ejecuta POST /api/v1/wallets/me/top-ups directamente contra la
              billetera institucional de CORE.
            </p>
            <div className={estilos.montos}>
              {MONTOS_RECARGA.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  className={`${estilos.opcionMonto} ${
                    montoElegido === monto ? estilos.montoElegido : ""
                  }`}
                  onClick={() => setMontoElegido(monto)}
                >
                  {pesos(monto)}
                </button>
              ))}
            </div>
            <Boton
              variante="primario"
              bloque
              disabled={recargando}
              onClick={() => void acreditar()}
            >
              {recargando
                ? "Acreditando en CORE…"
                : `Cargar ${pesos(montoElegido)}`}
            </Boton>
          </div>
        </aside>
      </div>
    </>
  );
}
