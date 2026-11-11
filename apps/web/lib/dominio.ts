import {
  HORAS_ANTICIPACION_ASISTENCIA,
  HORAS_ANTICIPACION_CANCELACION,
} from "@repo/contracts";

import type { Evento } from "./api";
import { minutos, seSolapan, sumarDias } from "./formato";

export type Tono = "neutro" | "exito" | "atencion" | "error";

export type EstadoEvento = { texto: string; tono: Tono };

/**
 * Estado publicado del evento. El orden importa: cupo lleno y últimos lugares
 * pesan más que el hecho de estar inscripto.
 */
export function estadoDe(evento: Evento, inscripto: boolean): EstadoEvento {
  if (evento.estadoPublicacion === "cancelado") {
    return { texto: "Cancelado", tono: "error" };
  }
  if (haFinalizado(evento)) {
    return { texto: "Finalizado", tono: "neutro" };
  }
  if (evento.reprogramado) {
    return { texto: "Reprogramado", tono: "atencion" };
  }
  if (evento.inscriptos >= evento.cupo) {
    return { texto: "Cupo completo", tono: "atencion" };
  }
  if (evento.inscriptos / evento.cupo > 0.85) {
    return { texto: "Últimos lugares", tono: "atencion" };
  }
  if (inscripto) return { texto: "Inscripto", tono: "exito" };
  return { texto: "Abierto", tono: "neutro" };
}

export function porcentajeCupo(evento: Evento): number {
  return Math.round((evento.inscriptos / evento.cupo) * 100);
}

export function cupoTexto(evento: Evento): string {
  return `${evento.inscriptos} / ${evento.cupo}`;
}

export function estaLleno(evento: Evento): boolean {
  return evento.inscriptos >= evento.cupo;
}

export function ingresosDe(evento: Evento): number {
  return evento.precio * evento.inscriptos;
}

/**
 * Otro evento al que la persona ya está inscripta y que se pisa con éste.
 * El sistema no admite dos inscripciones concurrentes.
 */
export function conflictoDe(
  evento: Evento,
  eventosInscriptos: Evento[],
): Evento | undefined {
  return eventosInscriptos.find(
    (propio) =>
      propio.id !== evento.id &&
      propio.fecha === evento.fecha &&
      seSolapan(
        minutos(evento.desde),
        minutos(evento.hasta),
        minutos(propio.desde),
        minutos(propio.hasta),
      ),
  );
}

/** Código de credencial digital que se muestra bajo el QR. */
export function codigoCredencial(eventoId: string, indice: number): string {
  return `UAD-${eventoId.toUpperCase()}-${48_210 + indice * 137}`;
}

export type Franja = { desde: string; hasta: string };

/** Reservas de la locación que se pisan con la franja pedida. */
export function choquesDe<T extends Franja>(franja: Franja, reservas: T[]): T[] {
  return reservas.filter((reserva) =>
    seSolapan(
      minutos(franja.desde),
      minutos(franja.hasta),
      minutos(reserva.desde),
      minutos(reserva.hasta),
    ),
  );
}

export function estaLibre(franja: Franja, reservas: Franja[]): boolean {
  return choquesDe(franja, reservas).length === 0;
}

function aHora(minutosDelDia: number): string {
  const hh = String(Math.floor(minutosDelDia / 60)).padStart(2, "0");
  const mm = String(minutosDelDia % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Primera franja libre de la misma duración dentro de la jornada, en saltos de
 * media hora. Es lo que se ofrece como alternativa cuando la locación está
 * ocupada: no tiene sentido sugerir un horario que también choca.
 */
export function primeraFranjaLibre(
  duracion: number,
  reservas: Franja[],
  jornada: Franja,
): Franja | undefined {
  const cierre = minutos(jornada.hasta);
  for (
    let inicio = minutos(jornada.desde);
    inicio + duracion <= cierre;
    inicio += 30
  ) {
    const candidata = { desde: aHora(inicio), hasta: aHora(inicio + duracion) };
    if (estaLibre(candidata, reservas)) return candidata;
  }
  return undefined;
}

export type FiltroCartelera =
  | "Todos"
  | "Gratuitos"
  | "Arancelados"
  | "Con cupo disponible";

export const FILTROS_CARTELERA: FiltroCartelera[] = [
  "Todos",
  "Gratuitos",
  "Arancelados",
  "Con cupo disponible",
];

export type PeriodoCartelera = "Cualquier fecha" | "Próximos 7 días" | "Este mes";

export const PERIODOS_CARTELERA: PeriodoCartelera[] = [
  "Cualquier fecha",
  "Próximos 7 días",
  "Este mes",
];

/** `hoy` en ISO `YYYY-MM-DD`. */
export function enPeriodo(
  evento: Evento,
  periodo: PeriodoCartelera,
  hoy: string,
): boolean {
  if (periodo === "Cualquier fecha") return true;
  if (periodo === "Este mes") return evento.fecha.slice(0, 7) === hoy.slice(0, 7);
  return evento.fecha >= hoy && evento.fecha <= sumarDias(hoy, 7);
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Busca por título, tipo, disertante, locación y sede, sin distinguir tildes ni mayúsculas. */
export function coincideConBusqueda(evento: Evento, busqueda: string): boolean {
  const termino = sinTildes(busqueda.trim());
  if (!termino) return true;
  return sinTildes(
    [evento.titulo, evento.tipo, evento.disertante, evento.locacion, evento.sede].join(" "),
  ).includes(termino);
}

export function filtrarEventos(
  eventos: Evento[],
  filtro: FiltroCartelera,
): Evento[] {
  switch (filtro) {
    case "Gratuitos":
      return eventos.filter((evento) => !evento.precio);
    case "Arancelados":
      return eventos.filter((evento) => evento.precio > 0);
    case "Con cupo disponible":
      return eventos.filter((evento) => evento.inscriptos < evento.cupo);
    default:
      return eventos;
  }
}

/**
 * La cancelación (con devolución del saldo si fue paga) cierra 24 hs antes del
 * inicio. Si el creador movió la fecha o el lugar, queda abierta hasta el inicio.
 */
export function puedeCancelarInscripcion(
  evento: Evento,
  ahora: Date = new Date(),
): boolean {
  const inicio = new Date(`${evento.fecha}T${evento.desde}:00`);
  const anticipacion = evento.reprogramado
    ? 0
    : HORAS_ANTICIPACION_CANCELACION * 60 * 60_000;
  return inicio.getTime() - ahora.getTime() >= anticipacion;
}

export function haComenzado(evento: Evento, ahora: Date = new Date()): boolean {
  return new Date(`${evento.fecha}T${evento.desde}:00`).getTime() <= ahora.getTime();
}

export function haFinalizado(evento: Evento, ahora: Date = new Date()): boolean {
  return new Date(`${evento.fecha}T${evento.hasta}:00`).getTime() <= ahora.getTime();
}

/** El creador puede editar o cancelar mientras el evento esté publicado y no haya empezado. */
export function puedeGestionar(evento: Evento, ahora: Date = new Date()): boolean {
  return evento.estadoPublicacion === "publicado" && !haComenzado(evento, ahora);
}

/**
 * La asistencia se habilita 1 hora antes del inicio del evento y permanece
 * activa indefinidamente (incluso pos-evento) para reclamos y ajustes.
 */
export function puedeTomarAsistencia(
  evento: Evento,
  ahora: Date = new Date(),
): boolean {
  const inicio = new Date(`${evento.fecha}T${evento.desde}:00`);
  return (
    ahora.getTime() >=
    inicio.getTime() - HORAS_ANTICIPACION_ASISTENCIA * 60 * 60_000
  );
}
