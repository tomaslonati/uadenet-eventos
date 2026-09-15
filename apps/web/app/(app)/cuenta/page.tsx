"use client";

import { useState } from "react";

import { Boton, BotonLink } from "@/components/ui/boton";
import { Segmentado } from "@/components/ui/controles";
import { Encabezado } from "@/components/ui/pantalla";
import { pesos } from "@/lib/formato";
import { buscarEvento } from "@/lib/mock/eventos";
import {
  CUENTA_ID,
  MOVIMIENTOS,
  NOTAS_CUENTA,
  type Movimiento,
} from "@/lib/mock/movimientos";
import { useSesion } from "@/lib/sesion";

import estilos from "./cuenta.module.css";

type FiltroMovimiento = "Todos" | "Cargas" | "Consumos";

const FILTROS: { valor: FiltroMovimiento; label: string }[] = [
  { valor: "Todos", label: "Todos" },
  { valor: "Cargas", label: "Cargas" },
  { valor: "Consumos", label: "Consumos" },
];

const MONTOS_RECARGA = [5_000, 10_000, 20_000];

type GrupoMovimientos = { mes: string; neto: number; items: Movimiento[] };

function agruparPorMes(movimientos: Movimiento[]): GrupoMovimientos[] {
  const grupos: GrupoMovimientos[] = [];
  for (const movimiento of movimientos) {
    let grupo = grupos.find((candidato) => candidato.mes === movimiento.mes);
    if (!grupo) {
      grupo = { mes: movimiento.mes, neto: 0, items: [] };
      grupos.push(grupo);
    }
    grupo.neto += movimiento.ingreso ? movimiento.monto : -movimiento.monto;
    grupo.items.push(movimiento);
  }
  return grupos;
}

export default function Cuenta() {
  const { saldo, usuario, inscripciones, cargarSaldo, mostrarToast } =
    useSesion();
  const [filtro, setFiltro] = useState<FiltroMovimiento>("Todos");
  const [montoElegido, setMontoElegido] = useState(10_000);

  const movimientos = MOVIMIENTOS.filter((movimiento) =>
    filtro === "Todos"
      ? true
      : filtro === "Cargas"
        ? movimiento.ingreso
        : !movimiento.ingreso,
  );

  const comprometido = inscripciones.reduce((total, id) => {
    const evento = buscarEvento(id);
    return total + (evento?.precio ?? 0);
  }, 0);
  const consumido = MOVIMIENTOS.filter((m) => !m.ingreso).reduce(
    (total, m) => total + m.monto,
    0,
  );

  const stats = [
    {
      clave: "En inscripciones activas",
      valor: pesos(comprometido),
      sub: "ya debitado de este saldo",
    },
    {
      clave: "Consumido en el cuatrimestre",
      valor: pesos(consumido),
      sub: "4 eventos arancelados",
    },
  ];

  const recargar = () => {
    cargarSaldo(montoElegido);
    mostrarToast(`Saldo cargado: ${pesos(montoElegido)}`);
  };

  return (
    <>
      <Encabezado
        titulo="Cuenta institucional"
        bajada="Las inscripciones pagas se descuentan de este saldo. No se usan tarjetas dentro del módulo."
      />

      <section className={estilos.resumen}>
        <div className={estilos.saldo}>
          <span className={estilos.saldoLabel}>Saldo disponible</span>
          <span className={estilos.saldoMonto}>{pesos(saldo)}</span>
          <span className={estilos.saldoId}>
            CI-{CUENTA_ID} · {usuario.mail}
          </span>
        </div>
        {stats.map((stat) => (
          <div key={stat.clave} className={estilos.stat}>
            <span className={estilos.statClave}>{stat.clave}</span>
            <span className={estilos.statValor}>{stat.valor}</span>
            <span className={estilos.statSub}>{stat.sub}</span>
          </div>
        ))}
        <BotonLink href="#recarga" variante="claro">
          Cargar saldo
        </BotonLink>
      </section>

      <div className={estilos.columnas}>
        <div className={estilos.movimientos}>
          <div className={estilos.movimientosHeader}>
            <span className={estilos.movimientosTitulo}>
              Movimientos · {movimientos.length}
            </span>
            <Segmentado
              etiqueta="Filtro de movimientos"
              opciones={FILTROS}
              activa={filtro}
              onCambio={setFiltro}
            />
          </div>

          {agruparPorMes(movimientos).map((grupo) => (
            <div key={grupo.mes} className={estilos.grupo}>
              <div className={estilos.grupoHeader}>
                <span className={estilos.grupoMes}>{grupo.mes}</span>
                <span className={estilos.regla} />
                <span
                  className={`${estilos.grupoNeto} ${
                    grupo.neto >= 0 ? estilos.grupoNetoPositivo : ""
                  }`}
                >
                  {grupo.neto >= 0 ? "+ " : "− "}
                  {pesos(grupo.neto)}
                </span>
              </div>
              <div className={estilos.lista}>
                {grupo.items.map((movimiento) => (
                  <div
                    key={`${movimiento.fecha}-${movimiento.concepto}`}
                    className={estilos.fila}
                  >
                    <span
                      className={`${estilos.icono} ${
                        movimiento.ingreso ? estilos.iconoIngreso : ""
                      }`}
                    />
                    <span className={estilos.filaDatos}>
                      <span className={estilos.concepto}>
                        {movimiento.concepto}
                      </span>
                      <span className={estilos.detalle}>
                        {movimiento.fecha} · {movimiento.detalle}
                      </span>
                    </span>
                    <span
                      className={`${estilos.monto} ${
                        movimiento.ingreso ? estilos.montoIngreso : ""
                      }`}
                    >
                      {movimiento.ingreso ? "+ " : "− "}
                      {pesos(movimiento.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className={estilos.lateral}>
          <div className={estilos.panel} id="recarga">
            <div>
              <div className={estilos.panelTitulo}>Cargar saldo</div>
              <p className={estilos.panelBajada}>
                Se debita de tu cuenta corriente y se acredita en el acto.
              </p>
            </div>
            <div className={estilos.montos}>
              {MONTOS_RECARGA.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  aria-pressed={monto === montoElegido}
                  className={`${estilos.opcionMonto} ${
                    monto === montoElegido ? estilos.montoElegido : ""
                  }`}
                  onClick={() => setMontoElegido(monto)}
                >
                  {pesos(monto)}
                </button>
              ))}
            </div>
            <Boton variante="primario" bloque onClick={recargar}>
              Cargar {pesos(montoElegido)}
            </Boton>
          </div>

          <div className={estilos.notas}>
            <span className={estilos.notasTitulo}>Cómo funciona</span>
            {NOTAS_CUENTA.map((nota) => (
              <div key={nota} className={estilos.nota}>
                <span className={estilos.vineta} />
                <span className={estilos.notaTexto}>{nota}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
