export type TipoEvento =
  | "Workshop"
  | "Seminario"
  | "Congreso"
  | "Charla"
  | "Taller"
  | "Coloquio"
  | "Muestra"
  | "Competencia";

export type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  /** ISO `YYYY-MM-DD`. */
  fecha: string;
  desde: string;
  hasta: string;
  sede: string;
  locacion: string;
  cupo: number;
  inscriptos: number;
  /** 0 = gratuito. */
  precio: number;
  disertante: string;
  area: string;
  descripcion: string;
};

/**
 * Fecha de referencia del prototipo. Fija a propósito: las pantallas todavía no
 * consumen la API, y un `new Date()` real haría divergir el render del servidor
 * y el del cliente.
 */
export const HOY = "2026-08-05";

/** Evento que el prototipo muestra "en curso" en el control de asistencia. */
export const EVENTO_EN_CURSO = "e1";

export const SEDES = ["Sede Centro", "Sede Norte", "Sede Costa"] as const;
export const TODAS_LAS_SEDES = "Todas las sedes";

export const LOCACIONES = [
  "Auditorio Magno",
  "Aula Magna B",
  "Salón de Actos",
  "Aula 302",
] as const;

export const TIPOS_EVENTO: TipoEvento[] = [
  "Workshop",
  "Seminario",
  "Congreso",
  "Charla",
  "Taller",
  "Coloquio",
  "Muestra",
];

export const EVENTOS: Evento[] = [
  {
    id: "e1",
    titulo: "Jornada de Inteligencia Artificial Aplicada",
    tipo: "Congreso",
    fecha: "2026-09-12",
    desde: "09:00",
    hasta: "13:00",
    sede: "Sede Centro",
    locacion: "Auditorio Magno",
    cupo: 300,
    inscriptos: 214,
    precio: 0,
    disertante: "Dra. Lucía Ferrari",
    area: "Facultad de Ingeniería y Ciencias Exactas",
    descripcion:
      "Tres paneles sobre adopción de modelos de lenguaje en la industria local, con casos de bancos, salud y logística. Cierra con una mesa abierta de preguntas y una demo de los proyectos del laboratorio de IA.",
  },
  {
    id: "e2",
    titulo: "Workshop: Arquitectura de Software Distribuido",
    tipo: "Workshop",
    fecha: "2026-09-12",
    desde: "10:00",
    hasta: "12:30",
    sede: "Sede Centro",
    locacion: "Aula Magna B",
    cupo: 60,
    inscriptos: 44,
    precio: 0,
    disertante: "Ing. Pablo Sosa",
    area: "Departamento de Sistemas",
    descripcion:
      "Taller práctico de diseño de sistemas orientados a eventos: colas, idempotencia, consistencia eventual y estrategias de despliegue multi-sede. Traer notebook.",
  },
  {
    id: "e3",
    titulo: "Coloquio de Finanzas Corporativas",
    tipo: "Coloquio",
    fecha: "2026-09-18",
    desde: "18:00",
    hasta: "21:00",
    sede: "Sede Norte",
    locacion: "Salón de Actos",
    cupo: 120,
    inscriptos: 87,
    precio: 12_500,
    disertante: "Mg. Renata Ledesma",
    area: "Facultad de Ciencias Económicas",
    descripcion:
      "Análisis de estructuras de capital en compañías de la región, con lectura previa de dos casos y discusión guiada. Incluye certificado de asistencia.",
  },
  {
    id: "e4",
    titulo: "Hackathon Interfacultades 48h",
    tipo: "Competencia",
    fecha: "2026-09-26",
    desde: "09:00",
    hasta: "20:00",
    sede: "Sede Centro",
    locacion: "Laboratorio 4",
    cupo: 80,
    inscriptos: 80,
    precio: 0,
    disertante: "Comité de Innovación",
    area: "Secretaría de Vinculación",
    descripcion:
      "Equipos de hasta cinco personas resuelven desafíos propuestos por empresas asociadas. Se provee mentoría, infraestructura y comidas durante las 48 horas.",
  },
  {
    id: "e5",
    titulo: "Seminario de Neurociencia y Aprendizaje",
    tipo: "Seminario",
    fecha: "2026-10-02",
    desde: "17:00",
    hasta: "20:00",
    sede: "Sede Costa",
    locacion: "Auditorio B",
    cupo: 150,
    inscriptos: 41,
    precio: 8_000,
    disertante: "Dr. Andrés Quiroga",
    area: "Facultad de Ciencias de la Salud",
    descripcion:
      "Evidencia reciente sobre memoria, atención y diseño de instrucción, con implicancias directas para el aula universitaria.",
  },
  {
    id: "e6",
    titulo: "Charla: Derecho y Datos Personales",
    tipo: "Charla",
    fecha: "2026-10-08",
    desde: "19:00",
    hasta: "21:00",
    sede: "Sede Norte",
    locacion: "Aula 302",
    cupo: 90,
    inscriptos: 63,
    precio: 0,
    disertante: "Dra. Sofía Mancini",
    area: "Facultad de Derecho",
    descripcion:
      "Marco normativo vigente, transferencias internacionales de datos y responsabilidad de las instituciones educativas frente a un incidente.",
  },
  {
    id: "e7",
    titulo: "Muestra de Proyectos Finales de Ingeniería",
    tipo: "Muestra",
    fecha: "2026-10-15",
    desde: "14:00",
    hasta: "20:00",
    sede: "Sede Centro",
    locacion: "Hall Central",
    cupo: 400,
    inscriptos: 152,
    precio: 0,
    disertante: "Cuerpo docente",
    area: "Facultad de Ingeniería y Ciencias Exactas",
    descripcion:
      "Exposición abierta de los trabajos finales del cuatrimestre, con jurado de empresas y votación del público.",
  },
  {
    id: "e8",
    titulo: "Taller de Escritura Académica",
    tipo: "Taller",
    fecha: "2026-10-21",
    desde: "10:00",
    hasta: "13:00",
    sede: "Sede Costa",
    locacion: "Aula 108",
    cupo: 40,
    inscriptos: 39,
    precio: 5_500,
    disertante: "Lic. Carla Bravo",
    area: "Centro de Escritura",
    descripcion:
      "Estructura de papers, uso de fuentes y edición de textos propios. Cada participante trabaja sobre un borrador que trae al taller.",
  },
];

export function buscarEvento(id: string): Evento | undefined {
  return EVENTOS.find((evento) => evento.id === id);
}

export type Reserva = { titulo: string; desde: string; hasta: string };

/** Agenda ya ocupada por locación y fecha, contra la que se valida el alta. */
export const RESERVAS: Record<string, Reserva[]> = {
  "Auditorio Magno|2026-09-12": [
    { titulo: "Jornada de IA Aplicada", desde: "09:00", hasta: "13:00" },
    { titulo: "Ensayo de acto de colación", desde: "15:00", hasta: "17:00" },
  ],
  "Aula Magna B|2026-09-12": [
    { titulo: "Workshop Arquitectura", desde: "10:00", hasta: "12:30" },
  ],
  "Salón de Actos|2026-09-12": [
    { titulo: "Reunión de claustro", desde: "08:00", hasta: "09:30" },
  ],
  "Aula 302|2026-09-12": [],
};

export function reservasDe(locacion: string, fecha: string): Reserva[] {
  return RESERVAS[`${locacion}|${fecha}`] ?? [];
}
