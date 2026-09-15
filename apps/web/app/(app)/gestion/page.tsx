"use client";

import { Badge } from "@/components/ui/badge";
import { BotonLink } from "@/components/ui/boton";
import { BarraCupo } from "@/components/ui/controles";
import { Datacards, Encabezado, type Indicador } from "@/components/ui/pantalla";
import { ingresosDe } from "@/lib/dominio";
import { numero, pesos } from "@/lib/formato";
import { EVENTOS, TODAS_LAS_SEDES } from "@/lib/mock/eventos";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./gestion.module.css";

export default function Gestion() {
  const { sede, estaInscripto } = useSesion();

  const deLaSede = EVENTOS.filter(
    (evento) => sede === TODAS_LAS_SEDES || evento.sede === sede,
  );
  const eventos = deLaSede.map((evento) =>
    vistaDe(evento, estaInscripto(evento.id)),
  );

  const inscriptos = deLaSede.reduce(
    (total, evento) => total + evento.inscriptos,
    0,
  );
  const ocupacionMedia = deLaSede.length
    ? Math.round(
        (deLaSede.reduce(
          (total, evento) => total + evento.inscriptos / evento.cupo,
          0,
        ) /
          deLaSede.length) *
          100,
      )
    : 0;
  const recaudado = deLaSede.reduce(
    (total, evento) => total + ingresosDe(evento),
    0,
  );

  const indicadores: Indicador[] = [
    {
      label: "Eventos activos",
      valor: String(deLaSede.length),
      sub: `en ${sede === TODAS_LAS_SEDES ? "3 sedes" : sede}`,
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
    {
      label: "Recaudado",
      valor: pesos(recaudado),
      sub: "vía cuenta institucional",
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Gestión de eventos"
        bajada={`${eventos.length} eventos · ${sede.toLowerCase()}`}
        accion={
          <BotonLink href="/eventos/nuevo" variante="primario">
            + Nuevo evento
          </BotonLink>
        }
      />

      <Datacards indicadores={indicadores} />

      <div className={estilos.tabla}>
        <div className={estilos.head}>
          <span>Fecha</span>
          <span>Evento</span>
          <span>Locación</span>
          <span>Ocupación</span>
          <span>Ingresos</span>
          <span />
        </div>
        {eventos.map((evento) => (
          <div key={evento.id} className={estilos.fila}>
            <div className={estilos.celdaFecha}>
              <span className={estilos.fecha}>{evento.fechaCorta}</span>
              <span className={estilos.horario}>{evento.rangoHorario}</span>
            </div>
            <div className={estilos.celdaEvento}>
              <span className={estilos.titulo}>{evento.titulo}</span>
              <Badge>{evento.tipo}</Badge>
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
              <BotonLink href={`/asistencia?evento=${evento.id}`} tamano="xs">
                Asistencia
              </BotonLink>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
