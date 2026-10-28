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
import { TODAS_LAS_SEDES } from "@/lib/api";
import {
  FILTROS_CARTELERA,
  filtrarEventos,
  type FiltroCartelera,
} from "@/lib/dominio";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

export default function Cartelera() {
  const { sede, eventos: catalogo, cargandoDatos, estaInscripto } = useSesion();
  const [vista, setVista] = useState<VistaCartelera>("agenda");
  const [filtro, setFiltro] = useState<FiltroCartelera>("Todos");

  const deLaSede = catalogo.filter(
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

      {cargandoDatos && eventos.length === 0 ? (
        <EstadoVacio texto="Cargando eventos desde la API…" />
      ) : eventos.length === 0 ? (
        <EstadoVacio texto="No hay eventos publicados que cumplan con este filtro." />
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
