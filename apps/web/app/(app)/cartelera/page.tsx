"use client";

import { useState } from "react";

import {
  VISTAS,
  VistaAgenda,
  VistaTabla,
  VistaTarjetas,
  type VistaCartelera,
} from "@/components/eventos/vistas-cartelera";
import { Boton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { ChipsFiltro, Segmentado } from "@/components/ui/controles";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import { TODAS_LAS_SEDES, hoyIso } from "@/lib/api";
import {
  FILTROS_CARTELERA,
  PERIODOS_CARTELERA,
  coincideConBusqueda,
  enPeriodo,
  filtrarEventos,
  haFinalizado,
  ordenarEventosCronologico,
  type FiltroCartelera,
  type PeriodoCartelera,
} from "@/lib/dominio";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./cartelera.module.css";

type EstadoTemporalCartelera = "proximos" | "finalizados";

const OPCIONES_ESTADO_CARTELERA: {
  valor: EstadoTemporalCartelera;
  label: string;
}[] = [
  { valor: "proximos", label: "Próximos" },
  { valor: "finalizados", label: "Finalizados" },
];

export default function Cartelera() {
  const { sede, eventos: catalogo, cargandoDatos, estaInscripto } = useSesion();
  const [vista, setVista] = useState<VistaCartelera>("agenda");
  const [estadoTemporal, setEstadoTemporal] =
    useState<EstadoTemporalCartelera>("proximos");
  const [filtro, setFiltro] = useState<FiltroCartelera>("Todos");
  const [periodo, setPeriodo] = useState<PeriodoCartelera>("Cualquier fecha");
  const [busqueda, setBusqueda] = useState("");

  // Los cancelados no se ofrecen: quien estaba inscripto los ve en "Mis inscripciones".
  const deLaSede = catalogo.filter(
    (evento) =>
      evento.estadoPublicacion === "publicado" &&
      (sede === TODAS_LAS_SEDES || evento.sede === sede),
  );
  const segunEstadoTemporal = deLaSede.filter((evento) =>
    estadoTemporal === "proximos" ? !haFinalizado(evento) : haFinalizado(evento),
  );
  const ordenados = ordenarEventosCronologico(
    segunEstadoTemporal,
    estadoTemporal === "proximos" ? "asc" : "desc",
  );
  const hoy = hoyIso();
  const eventos = filtrarEventos(ordenados, filtro)
    .filter((evento) =>
      estadoTemporal === "proximos" ? enPeriodo(evento, periodo, hoy) : true,
    )
    .filter((evento) => coincideConBusqueda(evento, busqueda))
    .map((evento) => vistaDe(evento, estaInscripto(evento.id)));

  const hayFiltros =
    filtro !== "Todos" ||
    (estadoTemporal === "proximos" && periodo !== "Cualquier fecha") ||
    busqueda.trim() !== "";
  const limpiarFiltros = () => {
    setFiltro("Todos");
    setPeriodo("Cualquier fecha");
    setBusqueda("");
  };

  return (
    <>
      <Encabezado
        titulo="Cartelera de eventos"
        bajada={`${eventos.length} ${
          estadoTemporal === "finalizados"
            ? "eventos finalizados"
            : "eventos próximos"
        } · ${sede.toLowerCase()}`}
        accion={
          <Segmentado
            etiqueta="Vista de la cartelera"
            opciones={VISTAS}
            activa={vista}
            onCambio={setVista}
          />
        }
      />

      <div className={estilos.selectorEstado}>
        <Segmentado
          etiqueta="Filtro de eventos por estado"
          opciones={OPCIONES_ESTADO_CARTELERA}
          activa={estadoTemporal}
          onCambio={setEstadoTemporal}
        />
      </div>

      <div className={estilos.barra}>
        <input
          type="search"
          className={`${claseControl} ${estilos.busqueda}`}
          aria-label="Buscar eventos"
          placeholder="Buscar por título, tipo, disertante o locación"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
        {estadoTemporal === "proximos" ? (
          <ChipsFiltro
            opciones={PERIODOS_CARTELERA}
            activa={periodo}
            onCambio={setPeriodo}
          />
        ) : null}
      </div>

      <ChipsFiltro
        opciones={FILTROS_CARTELERA}
        activa={filtro}
        onCambio={setFiltro}
      />

      {cargandoDatos && eventos.length === 0 ? (
        <EstadoVacio texto="Cargando eventos desde la API…" />
      ) : eventos.length === 0 ? (
        <EstadoVacio
          texto={
            hayFiltros
              ? "Ningún evento coincide con la búsqueda y los filtros elegidos."
              : estadoTemporal === "proximos"
                ? "Todavía no hay eventos próximos publicados en esta sede."
                : "No hay eventos finalizados en esta sede."
          }
          accion={
            hayFiltros ? (
              <Boton variante="primario" tamano="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            ) : undefined
          }
        />
      ) : vista === "grid" ? (
        <VistaTarjetas eventos={eventos} />
      ) : vista === "lista" ? (
        <VistaTabla eventos={eventos} />
      ) : (
        <VistaAgenda eventos={eventos} />
      )}
    </>
  );
}
