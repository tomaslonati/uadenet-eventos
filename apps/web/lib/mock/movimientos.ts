export type Movimiento = {
  fecha: string;
  mes: string;
  concepto: string;
  detalle: string;
  monto: number;
  /** `true` = carga de saldo, `false` = consumo. */
  ingreso: boolean;
};

export const CUENTA_ID = "48-207-3";

export const MOVIMIENTOS: Movimiento[] = [
  {
    fecha: "02 ago",
    mes: "agosto 2026",
    concepto: "Carga de saldo",
    detalle: "Débito automático · cuenta corriente",
    monto: 20_000,
    ingreso: true,
  },
  {
    fecha: "28 jul",
    mes: "julio 2026",
    concepto: "Coloquio de Finanzas Corporativas",
    detalle: "Inscripción · Sede Norte",
    monto: 12_500,
    ingreso: false,
  },
  {
    fecha: "11 jul",
    mes: "julio 2026",
    concepto: "Taller de Escritura Académica",
    detalle: "Inscripción · Sede Costa",
    monto: 5_500,
    ingreso: false,
  },
  {
    fecha: "03 jul",
    mes: "julio 2026",
    concepto: "Carga de saldo",
    detalle: "Transferencia acreditada",
    monto: 25_000,
    ingreso: true,
  },
  {
    fecha: "21 jun",
    mes: "junio 2026",
    concepto: "Congreso de Marketing Digital",
    detalle: "Inscripción · Sede Centro",
    monto: 14_000,
    ingreso: false,
  },
];

export const NOTAS_CUENTA = [
  "El arancel se descuenta al confirmar la inscripción, no al momento del evento.",
];

export type Asistencia = {
  fecha: string;
  titulo: string;
  asistio: boolean;
  certificado: string;
};

export const HISTORIAL_ASISTENCIA: Asistencia[] = [
  {
    fecha: "21 jul",
    titulo: "Taller de Escritura Académica",
    asistio: true,
    certificado: "Certificado",
  },
  {
    fecha: "02 jul",
    titulo: "Charla: Ética Profesional en Ingeniería",
    asistio: true,
    certificado: "Certificado",
  },
  {
    fecha: "14 jun",
    titulo: "Congreso de Marketing Digital",
    asistio: false,
    certificado: "—",
  },
];
