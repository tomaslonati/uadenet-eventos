"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { BotonLink } from "@/components/ui/boton";
import { BarraCupo, Segmentado } from "@/components/ui/controles";
import {
  Datacards,
  Encabezado,
  EstadoVacio,
  type Indicador,
} from "@/components/ui/pantalla";
import { TODAS_LAS_SEDES } from "@/lib/api";
import {
  haFinalizado,
  ingresosDe,
  ordenarEventosCronologico,
  puedeGestionar,
} from "@/lib/dominio";
import { numero, pesos } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./gestion.module.css";

type TabGestion = "activos" | "finalizados" | "todos";

const TABS_GESTION: { valor: TabGestion; label: string }[] = [
  { valor: "activos", label: "Próximos" },
  { valor: "finalizados", label: "Finalizados" },
  { valor: "todos", label: "Todos" },
];

export default function Gestion() {
  const {
    sede,
    sedes,
    eventos: catalogo,
    estaInscripto,
    usuario,
  } = useSesion();

  const [tabGestion, setTabGestion] = useState<TabGestion>("activos");

  const deLaSede = catalogo.filter(
    (evento) => sede === TODAS_LAS_SEDES || evento.sede === sede,
  );
  // Los cancelados quedan en la tabla como historial, pero no cuentan en los indicadores.
  const activos = deLaSede.filter(
    (evento) => evento.estadoPublicacion === "publicado",
  );

  const segunTab = deLaSede.filter((evento) => {
    if (tabGestion === "activos") return !haFinalizado(evento);
    if (tabGestion === "finalizados") return haFinalizado(evento);
    return true;
  });

  const ordenados = ordenarEventosCronologico(
    segunTab,
    tabGestion === "finalizados" ? "desc" : "asc",
  );

  const eventos = ordenados.map((evento) =>
    vistaDe(evento, estaInscripto(evento.id)),
  );

  const inscriptos = activos.reduce(
    (total, evento) => total + evento.inscriptos,
    0,
  );
  const ocupacionMedia = activos.length
    ? Math.round(
        (activos.reduce(
          (total, evento) => total + evento.inscriptos / evento.cupo,
          0,
        ) /
          activos.length) *
          100,
      )
    : 0;

  const indicadores: Indicador[] = [
    {
      label: "Eventos activos",
      valor: String(activos.length),
      sub: `en ${sede === TODAS_LAS_SEDES ? `${sedes.length || 3} sedes` : sede}`,
    },
    {
      label: "Inscriptos",
      valor: numero(inscriptos),
      sub: "total del cuatrimestre",
    },
    {
      label: "Ocupación media",
      valor: `${ocupacionMedia}%`,
      sub: "sobre cupo publicado",
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Gestión de eventos"
        bajada={`${eventos.length} ${
          tabGestion === "finalizados"
            ? "eventos finalizados"
            : tabGestion === "activos"
              ? "eventos próximos"
              : "eventos"
        } · ${sede.toLowerCase()}`}
        accion={
          <BotonLink href="/eventos/nuevo" variante="primario">
            + Nuevo evento
          </BotonLink>
        }
      />

      <Datacards indicadores={indicadores} />

      <div className={estilos.barraFiltros}>
        <Segmentado
          etiqueta="Filtrar por estado del evento"
          opciones={TABS_GESTION}
          activa={tabGestion}
          onCambio={setTabGestion}
        />
      </div>

      {eventos.length === 0 ? (
        <EstadoVacio
          texto={
            tabGestion === "activos"
              ? "No hay eventos próximos en esta sede."
              : tabGestion === "finalizados"
                ? "No hay eventos finalizados en esta sede."
                : "Todavía no hay eventos registrados en esta sede."
          }
          accion={
            tabGestion === "activos" ? (
              <BotonLink href="/eventos/nuevo" variante="primario" tamano="sm">
                + Nuevo evento
              </BotonLink>
            ) : undefined
          }
        />
      ) : (
        <div className={estilos.tabla}>
          <div className={estilos.head}>
            <span>Fecha</span>
            <span>Evento</span>
            <span>Locación</span>
            <span>Ocupación</span>
            <span>Ingresos</span>
            <span />
          </div>
          {eventos.map((evento) => {
            const original = catalogo.find((e) => e.id === evento.id);
            const esCreador = original?.creadoPor === usuario.id;
            const cancelado = evento.estadoPublicacion === "cancelado";

            return (
              <div
                key={evento.id}
                className={`${estilos.fila} ${cancelado ? estilos.filaCancelada : ""}`}
              >
                <div className={estilos.celdaFecha}>
                  <span className={estilos.fecha}>{evento.fechaCorta}</span>
                  <span className={estilos.horario}>{evento.rangoHorario}</span>
                </div>
                <div className={estilos.celdaEvento}>
                  <span className={estilos.titulo}>{evento.titulo}</span>
                  <div className={estilos.etiquetas}>
                    <Badge>{evento.tipo}</Badge>
                    {cancelado || evento.reprogramado ? (
                      <Badge tono={evento.estado.tono}>{evento.estado.texto}</Badge>
                    ) : null}
                  </div>
                </div>
                <span className={estilos.locacion}>{evento.locacion}</span>
                <div className={estilos.celdaCupo}>
                  <span className={estilos.cupoTexto}>{evento.cupoLabel}</span>
                  <BarraCupo porcentaje={evento.porcentaje} />
                </div>
                <span className={estilos.ingresos}>
                  {evento.precio ? pesos(ingresosDe(evento)) : "—"}
                </span>
                <div className={estilos.acciones}>
                  <BotonLink href={`/eventos/${evento.id}`} tamano="xs">
                    Ver
                  </BotonLink>
                  {esCreador && original && puedeGestionar(original) ? (
                    <BotonLink href={`/eventos/${evento.id}/editar`} tamano="xs">
                      Editar
                    </BotonLink>
                  ) : null}
                  {esCreador && !cancelado ? (
                    <BotonLink
                      href={`/asistencia?evento=${evento.id}`}
                      tamano="xs"
                    >
                      Asistencia
                    </BotonLink>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
