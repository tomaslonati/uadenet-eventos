import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { BarraCupo, Cupo } from "@/components/ui/controles";
import type { EventoVista } from "@/lib/vista-evento";

import estilos from "./eventos.module.css";

export type VistaCartelera = "grid" | "lista" | "agenda";

export const VISTAS: { valor: VistaCartelera; label: string }[] = [
  { valor: "grid", label: "Tarjetas" },
  { valor: "lista", label: "Tabla" },
  { valor: "agenda", label: "Agenda" },
];

function Precio({ evento }: { evento: EventoVista }) {
  return (
    <span
      className={`${estilos.precio} ${evento.gratuito ? estilos.precioGratuito : ""}`}
    >
      {evento.precioLabel}
    </span>
  );
}

export function VistaTarjetas({ eventos }: { eventos: EventoVista[] }) {
  return (
    <div className={estilos.grilla}>
      {eventos.map((evento) => (
        <Link
          key={evento.id}
          href={`/eventos/${evento.id}`}
          className={estilos.tarjeta}
        >
          <div
            className={`${estilos.franja} ${evento.inscripto ? estilos.franjaPropia : ""}`}
          />
          <div className={estilos.tarjetaCuerpo}>
            <div className={estilos.fila}>
              <Badge>{evento.tipo}</Badge>
              <Badge tono={evento.estado.tono}>{evento.estado.texto}</Badge>
              <div className={estilos.empuje} />
              <Precio evento={evento} />
            </div>
            <h3 className={estilos.tarjetaTitulo}>{evento.titulo}</h3>
            <div className={estilos.tarjetaDatos}>
              <span>
                {evento.fechaLarga} · {evento.rangoHorario}
              </span>
              <span>
                {evento.sede} — {evento.locacion}
              </span>
            </div>
            <div className={estilos.empuje} />
            <Cupo texto={evento.cupoLabel} porcentaje={evento.porcentaje} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function VistaTabla({ eventos }: { eventos: EventoVista[] }) {
  return (
    <div className={estilos.tabla}>
      <div className={estilos.tablaHead}>
        <span>Fecha</span>
        <span>Evento</span>
        <span>Locación</span>
        <span>Cupo</span>
        <span>Inscripción</span>
      </div>
      {eventos.map((evento) => (
        <Link
          key={evento.id}
          href={`/eventos/${evento.id}`}
          className={estilos.tablaFila}
        >
          <div className={estilos.celdaFecha}>
            <span className={estilos.fechaCorta}>{evento.fechaCorta}</span>
            <span className={estilos.horario}>{evento.rangoHorario}</span>
          </div>
          <div className={estilos.celdaEvento}>
            <span className={estilos.eventoTitulo}>{evento.titulo}</span>
            <Badge>{evento.tipo}</Badge>
          </div>
          <span className={estilos.celdaTexto}>{evento.locacion}</span>
          <div className={estilos.celdaCupo}>
            <span className={estilos.cupoTexto}>{evento.cupoLabel}</span>
            <BarraCupo porcentaje={evento.porcentaje} />
          </div>
          <Precio evento={evento} />
        </Link>
      ))}
    </div>
  );
}

export type GrupoMes = { mes: string; eventos: EventoVista[] };

/** Agrupa por mes conservando el orden cronológico del listado. */
export function agruparPorMes(eventos: EventoVista[]): GrupoMes[] {
  const grupos: GrupoMes[] = [];
  for (const evento of eventos) {
    const grupo = grupos.find((candidato) => candidato.mes === evento.mes);
    if (grupo) grupo.eventos.push(evento);
    else grupos.push({ mes: evento.mes, eventos: [evento] });
  }
  return grupos;
}

export function VistaAgenda({ eventos }: { eventos: EventoVista[] }) {
  return (
    <div className={estilos.agenda}>
      {agruparPorMes(eventos).map((grupo) => (
        <div key={grupo.mes} className={estilos.grupo}>
          <div className={estilos.grupoMes}>
            <span className={estilos.grupoMesNombre}>{grupo.mes} 2026</span>
            <span className={estilos.grupoMesCuenta}>
              {grupo.eventos.length}{" "}
              {grupo.eventos.length === 1 ? "evento" : "eventos"}
            </span>
          </div>
          <div className={estilos.grupoItems}>
            {grupo.eventos.map((evento) => (
              <Link
                key={evento.id}
                href={`/eventos/${evento.id}`}
                className={estilos.filaAgenda}
              >
                <div className={estilos.calendario}>
                  <span className={estilos.calendarioDia}>{evento.dia}</span>
                  <span className={estilos.calendarioMes}>
                    {evento.mesCorto}
                  </span>
                </div>
                <div className={estilos.agendaDatos}>
                  <span className={estilos.agendaTitulo}>{evento.titulo}</span>
                  <span className={estilos.agendaSub}>
                    {evento.rangoHorario} · {evento.sede} — {evento.locacion}
                  </span>
                </div>
                <div className={estilos.agendaDerecha}>
                  <Badge tono={evento.estado.tono}>{evento.estado.texto}</Badge>
                  <span
                    className={`${estilos.agendaPrecio} ${
                      evento.gratuito ? estilos.precioGratuito : ""
                    }`}
                  >
                    {evento.precioLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
