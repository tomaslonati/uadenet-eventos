import {
  cupoTexto,
  estaLleno,
  estadoDe,
  porcentajeCupo,
  type EstadoEvento,
} from "./dominio";
import {
  dia,
  fechaCorta,
  fechaLarga,
  horario,
  mes,
  mesCorto,
  pesos,
} from "./formato";
import type { Evento } from "./mock/eventos";

export type EventoVista = Evento & {
  estado: EstadoEvento;
  inscripto: boolean;
  lleno: boolean;
  porcentaje: number;
  cupoLabel: string;
  precioLabel: string;
  gratuito: boolean;
  fechaLarga: string;
  fechaCorta: string;
  dia: string;
  mes: string;
  mesCorto: string;
  rangoHorario: string;
};

/** Campos derivados que necesitan todas las vistas de la cartelera. */
export function vistaDe(evento: Evento, inscripto: boolean): EventoVista {
  return {
    ...evento,
    estado: estadoDe(evento, inscripto),
    inscripto,
    lleno: estaLleno(evento),
    porcentaje: porcentajeCupo(evento),
    cupoLabel: cupoTexto(evento),
    precioLabel: evento.precio ? pesos(evento.precio) : "Gratuito",
    gratuito: evento.precio === 0,
    fechaLarga: fechaLarga(evento.fecha),
    fechaCorta: fechaCorta(evento.fecha),
    dia: dia(evento.fecha),
    mes: mes(evento.fecha),
    mesCorto: mesCorto(evento.fecha),
    rangoHorario: horario(evento.desde, evento.hasta),
  };
}
