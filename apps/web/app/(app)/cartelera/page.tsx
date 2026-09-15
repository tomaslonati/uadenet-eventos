"use client";

import { useState } from "react";

import {
  VISTAS,
  VistaAgenda,
  VistaTabla,
  VistaTarjetas,
  type VistaCartelera,
} from "@/components/eventos/vistas-cartelera";
import { ChipsFiltro, Segmentado } from "@/components/ui/controles";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import {
  FILTROS_CARTELERA,
  filtrarEventos,
  type FiltroCartelera,
} from "@/lib/dominio";
import { EVENTOS, TODAS_LAS_SEDES } from "@/lib/mock/eventos";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

export default function Cartelera() {
  const { sede, estaInscripto } = useSesion();
  const [vista, setVista] = useState<VistaCartelera>("agenda");
  const [filtro, setFiltro] = useState<FiltroCartelera>("Todos");

  const deLaSede = EVENTOS.filter(
    (evento) => sede === TODAS_LAS_SEDES || evento.sede === sede,
  );
  const eventos = filtrarEventos(deLaSede, filtro).map((evento) =>
    vistaDe(evento, estaInscripto(evento.id)),
  );

  return (
    <>
      <Encabezado
        titulo="Cartelera de eventos"
        bajada={`${eventos.length} eventos · ${sede.toLowerCase()}`}
        accion={
          <Segmentado
            etiqueta="Vista de la cartelera"
            opciones={VISTAS}
            activa={vista}
            onCambio={setVista}
          />
        }
      />

      <ChipsFiltro
        opciones={FILTROS_CARTELERA}
        activa={filtro}
        onCambio={setFiltro}
      />

      {eventos.length === 0 ? (
        <EstadoVacio texto="No hay eventos que cumplan con este filtro." />
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
