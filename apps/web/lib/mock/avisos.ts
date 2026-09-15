export type TipoAviso = "Recordatorio" | "Asistencia";
export type GrupoAviso = "Hoy" | "Esta semana" | "Antes";

export type Aviso = {
  id: string;
  grupo: GrupoAviso;
  tipo: TipoAviso;
  canal: string;
  titulo: string;
  texto: string;
  cuando: string;
  sinLeer: boolean;
  accion?: { label: string; href: string };
};

export const GRUPOS_AVISO: GrupoAviso[] = ["Hoy", "Esta semana", "Antes"];

export const FILTROS_AVISO = ["Todos", "Recordatorio"] as const;

export const AVISOS: Aviso[] = [
  {
    id: "a1",
    grupo: "Hoy",
    tipo: "Recordatorio",
    canal: "Mail + portal",
    titulo: "Falta una semana: Jornada de Inteligencia Artificial Aplicada",
    texto:
      "Sábado 12 de septiembre, 09:00 h, Sede Centro — Auditorio Magno. Tu credencial digital ya está disponible en el portal.",
    cuando: "hace 2 h",
    sinLeer: true,
    accion: { label: "Ver mi credencial", href: "/mis-inscripciones" },
  },
  {
    id: "a5",
    grupo: "Antes",
    tipo: "Asistencia",
    canal: "Portal",
    titulo: "Asistencia registrada: Taller de Escritura Académica",
    texto:
      "Tu ingreso quedó validado a las 10:04. El certificado se emite dentro de las 72 horas.",
    cuando: "21 de julio",
    sinLeer: false,
  },
];

/** Timeline de la regla automática de recordatorios, documentada en pantalla. */
export const REGLA_RECORDATORIO = [
  {
    momento: "T−7 días",
    detalle:
      "Se envía el recordatorio por mail y aparece en la campana del portal.",
    cumplido: true,
  },
  {
    momento: "T−24 horas",
    detalle: "Segundo aviso solo a quienes no abrieron el primero.",
    cumplido: true,
  },
  {
    momento: "Día del evento",
    detalle:
      "La credencial pasa al frente de Mis inscripciones y habilita el escaneo.",
    cumplido: false,
  },
];

export const PREVIEW_RECORDATORIO = {
  remitente: "eventos@uadenet.edu",
  evento: "Jornada de Inteligencia Artificial Aplicada",
  enEspera: 12,
  datos: [
    { clave: "Fecha", valor: "sábado 12 de septiembre de 2026" },
    { clave: "Horario", valor: "09:00 a 13:00 h" },
    { clave: "Lugar", valor: "Sede Centro — Auditorio Magno" },
    { clave: "Credencial", valor: "UAD-E1-48210" },
  ],
};
