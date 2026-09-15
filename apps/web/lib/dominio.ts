import { minutos, seSolapan } from "./formato";
import type { Evento } from "./mock/eventos";
import { buscarEvento } from "./mock/eventos";

export type Tono = "neutro" | "exito" | "atencion" | "error";

export type EstadoEvento = { texto: string; tono: Tono };

/**
 * Estado publicado del evento. El orden importa: cupo lleno y últimos lugares
 * pesan más que el hecho de estar inscripto.
 */
export function estadoDe(evento: Evento, inscripto: boolean): EstadoEvento {
  if (evento.inscriptos >= evento.cupo) {
    return { texto: "Lista de espera", tono: "atencion" };
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
 * Asistencia efectiva de ediciones anteriores. Valor simulado hasta que exista
 * el histórico real de acreditaciones.
 */
export function asistenciaHistorica(evento: Evento): number {
  return 72 + (evento.inscriptos % 21);
}

/**
 * Otro evento al que la persona ya está inscripta y que se pisa con éste.
 * El sistema no admite dos inscripciones concurrentes.
 */
export function conflictoDe(
  evento: Evento,
  inscripciones: string[],
): Evento | undefined {
  return inscripciones
    .map(buscarEvento)
    .filter((propio): propio is Evento => Boolean(propio))
    .find(
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
