export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Separador de miles con punto, sin depender del ICU del runtime (evita mismatch de hidratación). */
export function numero(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formato de montos del sistema de diseño: `$ 12.500`. */
export function pesos(n: number): string {
  return `$ ${numero(Math.abs(n))}`;
}

/** Minutos desde la medianoche para un `HH:MM`. */
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

type PartesFecha = { anio: string; mes: string; dia: string };

function partes(iso: string): PartesFecha {
  const [anio = "", mes = "", dia = ""] = iso.split("-");
  return { anio, mes, dia };
}

export function fechaLarga(iso: string): string {
  const { mes, dia } = partes(iso);
  return `${Number(dia)} de ${nombreMes(mes)}`;
}

export function fechaCorta(iso: string): string {
  const { mes, dia } = partes(iso);
  return `${dia}/${mes}`;
}

export function anio(iso: string): string {
  return partes(iso).anio;
}

export function dia(iso: string): string {
  return partes(iso).dia;
}

function nombreMes(mes: string): string {
  return MESES[Number(mes) - 1] ?? "";
}

export function mes(iso: string): string {
  return nombreMes(partes(iso).mes);
}

export function mesCorto(iso: string): string {
  return mes(iso).slice(0, 3);
}

export function horario(desde: string, hasta: string): string {
  return `${desde}–${hasta}`;
}

const TRATAMIENTOS = /^(Dra?|Ing|Mg|Lic)\.\s*/;

export function iniciales(nombre: string): string {
  return nombre
    .replace(TRATAMIENTOS, "")
    .split(" ")
    .map((palabra) => palabra[0])
    .slice(0, 2)
    .join("");
}

export function nombrePila(nombre: string): string {
  return nombre.replace(TRATAMIENTOS, "").split(" ")[0] ?? nombre;
}

/** Dos rangos se solapan si uno empieza antes de que termine el otro. */
export function seSolapan(
  inicioA: number,
  finA: number,
  inicioB: number,
  finB: number,
): boolean {
  return inicioA < finB && inicioB < finA;
}

/** Fecha ISO desplazada en días, sin arrastrar zona horaria. */
export function sumarDias(iso: string, dias: number): string {
  const fecha = new Date(`${iso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function diasEntre(desdeIso: string, hastaIso: string): number {
  const a = Date.parse(`${desdeIso}T12:00:00Z`);
  const b = Date.parse(`${hastaIso}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
