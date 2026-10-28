export type TipoEvento =
  | "Workshop"
  | "Seminario"
  | "Congreso"
  | "Charla"
  | "Taller"
  | "Coloquio"
  | "Muestra"
  | "Competencia";

export type CategoriaPrecio = "general" | "especial";

export const TIPOS_EVENTO: TipoEvento[] = [
  "Workshop",
  "Seminario",
  "Congreso",
  "Charla",
  "Taller",
  "Coloquio",
  "Muestra",
  "Competencia",
];

export const TODAS_LAS_SEDES = "Todas las sedes";

export const TARIFAS_DEFAULT: Record<CategoriaPrecio, number> = {
  general: 5_500,
  especial: 12_500,
};

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
  locacionId?: string;
  cupo: number;
  inscriptos: number;
  yaInscripto?: boolean;
  categoriaPrecio: CategoriaPrecio | null;
  precio: number;
  disertante: string;
  area: string;
  descripcion: string;
};

export type Reserva = { titulo: string; desde: string; hasta: string };

export type LocacionApi = {
  id: string;
  nombre: string;
  sede: string;
  capacidad: number;
  aptoEventos: boolean;
};

export type SedeApi = {
  id: string;
  nombre: string;
};

export type InscripcionApi = {
  id: string;
  eventoId: string;
  usuarioId: string;
  fechaInscripcion: string;
  estado: "inscripto";
  pagoConfirmado: boolean;
  montoCobrado: number | null;
};

export type AsistenteEventoApi = {
  inscripcionId: string;
  eventoId: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: "estudiante" | "docente" | "administrativo";
  };
  acreditado: boolean;
  asistencia: {
    id: string;
    inscripcionId: string;
    confirmadaEn: string;
    metodo: "qr" | "codigo-en-sala" | "manual";
  } | null;
};

export type MovimientoWalletApi = {
  transactionId: string;
  status: "PENDING" | "POSTED" | "REJECTED" | "REVERSED";
  type: "CREDIT" | "DEBIT" | "REVERSAL";
  concept: string;
  amount: string;
  currency: "ARS";
  balanceAfter: string | null;
  externalReference: string;
  originalTransactionId: string | null;
  createdAt: string;
};

type EventoDeCarteleraApi = {
  id: string;
  titulo: string;
  descripcion: string;
  locacionId: string;
  cupoMaximo: number;
  fechaInicio: string;
  fechaFin: string;
  esPago: boolean;
  categoriaPrecio: CategoriaPrecio | null;
  creadoPor: string;
  locacion: { nombre: string; sede: string };
  inscriptos: number;
  disponibles: number;
  yaInscripto: boolean;
  precio: number | null;
};

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

function headersDe(token?: string | null, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatearFechaLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatearHoraLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

export function hoyIso(): string {
  return formatearFechaLocal(new Date());
}

export function codificarDescripcionEvento(
  tipo: TipoEvento,
  disertante: string,
  descripcion: string,
): string {
  const autor = disertante.trim() || "Equipo Académico UADE";
  const texto = descripcion.trim() || "Actividad académica presencial.";
  return `[${tipo} | ${autor}]\n${texto}`;
}

function decodificarDescripcionEvento(cruda: string): {
  tipo: TipoEvento;
  disertante: string;
  descripcion: string;
} {
  const match = /^\[([^|\]]+)\|\s*([^\]]+)\]\n([\s\S]*)$/.exec(cruda);
  if (!match) {
    return {
      tipo: "Charla",
      disertante: "Equipo Académico UADE",
      descripcion: cruda,
    };
  }
  const tipoCandidato = (match[1] ?? "").trim() as TipoEvento;
  const tipo = TIPOS_EVENTO.includes(tipoCandidato) ? tipoCandidato : "Charla";
  const disertante = (match[2] ?? "").trim() || "Equipo Académico UADE";
  const descripcion = (match[3] ?? "").trim() || cruda;
  return { tipo, disertante, descripcion };
}

export function adaptarEventoApi(raw: EventoDeCarteleraApi): Evento {
  const meta = decodificarDescripcionEvento(raw.descripcion);
  const precio =
    raw.esPago
      ? (raw.precio ??
        (raw.categoriaPrecio ? TARIFAS_DEFAULT[raw.categoriaPrecio] : 0))
      : 0;

  return {
    id: raw.id,
    titulo: raw.titulo,
    tipo: meta.tipo,
    fecha: formatearFechaLocal(raw.fechaInicio),
    desde: formatearHoraLocal(raw.fechaInicio),
    hasta: formatearHoraLocal(raw.fechaFin),
    sede: raw.locacion.sede,
    locacion: raw.locacion.nombre,
    locacionId: raw.locacionId,
    cupo: raw.cupoMaximo,
    inscriptos: raw.inscriptos,
    yaInscripto: raw.yaInscripto,
    categoriaPrecio: raw.esPago ? raw.categoriaPrecio : null,
    precio,
    disertante: meta.disertante,
    area: raw.locacion.sede,
    descripcion: meta.descripcion,
  };
}

export function reservasDeEventos(
  eventos: Evento[],
  locacionNombre: string,
  fecha: string,
): Reserva[] {
  return eventos
    .filter((e) => e.locacion === locacionNombre && e.fecha === fecha)
    .map((e) => ({
      titulo: e.titulo,
      desde: e.desde,
      hasta: e.hasta,
    }));
}

async function leerErrorApi(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      detail?: string;
    };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.message)) return body.message.join(". ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // Ignorar error de parseo JSON
  }
  return fallback;
}

export async function fetchEventosApi(token?: string | null): Promise<Evento[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/eventos`, {
    headers: headersDe(token),
  });
  if (!res.ok) {
    throw new Error(await leerErrorApi(res, "No se pudieron cargar los eventos."));
  }
  const lista = (await res.json()) as EventoDeCarteleraApi[];
  return lista.map(adaptarEventoApi);
}

export async function fetchEventoPorIdApi(
  id: string,
  token?: string | null,
): Promise<Evento | null> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/eventos/${encodeURIComponent(id)}`,
    { headers: headersDe(token) },
  );
  if (res.status === 404 || res.status === 400) {
    return null;
  }
  if (!res.ok) {
    throw new Error(await leerErrorApi(res, "No se pudo cargar el evento."));
  }
  const raw = (await res.json()) as EventoDeCarteleraApi;
  return adaptarEventoApi(raw);
}

export async function crearEventoApi(
  datos: {
    titulo: string;
    tipo: TipoEvento;
    disertante: string;
    descripcion: string;
    locacionId: string;
    cupoMaximo: number;
    fecha: string;
    desde: string;
    hasta: string;
    esPago: boolean;
    categoriaPrecio: CategoriaPrecio | null;
  },
  token?: string | null,
): Promise<{ id: string }> {
  const fechaInicio = new Date(`${datos.fecha}T${datos.desde}:00`).toISOString();
  const fechaFin = new Date(`${datos.fecha}T${datos.hasta}:00`).toISOString();

  const res = await fetch(`${API_BASE_URL}/api/v1/eventos`, {
    method: "POST",
    headers: headersDe(token, true),
    body: JSON.stringify({
      titulo: datos.titulo.trim(),
      descripcion: codificarDescripcionEvento(
        datos.tipo,
        datos.disertante,
        datos.descripcion,
      ),
      locacionId: datos.locacionId,
      cupoMaximo: datos.cupoMaximo,
      fechaInicio,
      fechaFin,
      esPago: datos.esPago,
      categoriaPrecio: datos.esPago ? datos.categoriaPrecio : null,
    }),
  });

  if (!res.ok) {
    throw new Error(
      await leerErrorApi(res, "No se pudo publicar el evento en la API."),
    );
  }

  return (await res.json()) as { id: string };
}

export async function fetchLocacionesApi(
  token?: string | null,
): Promise<LocacionApi[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/locaciones`, {
    headers: headersDe(token),
  });
  if (!res.ok) return [];
  return (await res.json()) as LocacionApi[];
}

export async function fetchSedesApi(token?: string | null): Promise<SedeApi[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/sedes`, {
    headers: headersDe(token),
  });
  if (!res.ok) return [];
  return (await res.json()) as SedeApi[];
}

export async function fetchTarifasApi(
  token?: string | null,
): Promise<Record<CategoriaPrecio, number>> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tarifas`, {
    headers: headersDe(token),
  });
  if (!res.ok) return TARIFAS_DEFAULT;
  const data = (await res.json()) as {
    general: number | null;
    especial: number | null;
  };
  return {
    general: data.general ?? TARIFAS_DEFAULT.general,
    especial: data.especial ?? TARIFAS_DEFAULT.especial,
  };
}

export async function fetchInscripcionesApi(
  token?: string | null,
): Promise<InscripcionApi[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/inscripciones`, {
    headers: headersDe(token),
  });
  if (!res.ok) return [];
  return (await res.json()) as InscripcionApi[];
}

export async function crearInscripcionApi(
  eventoId: string,
  token?: string | null,
): Promise<InscripcionApi> {
  const res = await fetch(`${API_BASE_URL}/api/v1/inscripciones`, {
    method: "POST",
    headers: headersDe(token, true),
    body: JSON.stringify({ eventoId }),
  });
  if (!res.ok) {
    throw new Error(
      await leerErrorApi(res, "No se pudo confirmar la inscripción."),
    );
  }
  return (await res.json()) as InscripcionApi;
}

export async function fetchAsistenciaEventoApi(
  eventoId: string,
  token?: string | null,
): Promise<AsistenteEventoApi[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/asistencia?eventoId=${encodeURIComponent(eventoId)}`,
    { headers: headersDe(token) },
  );
  if (!res.ok) return [];
  return (await res.json()) as AsistenteEventoApi[];
}

export async function registrarAsistenciaApi(
  inscripcionId: string,
  metodo: "qr" | "codigo-en-sala" | "manual",
  token?: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/asistencia`, {
    method: "POST",
    headers: headersDe(token, true),
    body: JSON.stringify({ inscripcionId, metodo }),
  });
  if (!res.ok) {
    throw new Error(
      await leerErrorApi(res, "No se pudo registrar la asistencia."),
    );
  }
}

export async function fetchSaldoApi(
  token?: string | null,
): Promise<number | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/usuarios/me/saldo`, {
    headers: headersDe(token),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { balance?: string };
  const parsed = Number.parseFloat(data.balance ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchMovimientosWalletApi(
  token?: string | null,
): Promise<MovimientoWalletApi[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/usuarios/me/movimientos`, {
    headers: headersDe(token),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: MovimientoWalletApi[] };
  return data.items ?? [];
}

export async function recargarSaldoApi(
  monto: number,
  token?: string | null,
): Promise<MovimientoWalletApi> {
  const res = await fetch(`${API_BASE_URL}/api/v1/usuarios/me/recargas`, {
    method: "POST",
    headers: headersDe(token, true),
    body: JSON.stringify({ monto }),
  });
  if (!res.ok) {
    throw new Error(
      await leerErrorApi(res, "No se pudo acreditar la recarga en CORE."),
    );
  }
  return (await res.json()) as MovimientoWalletApi;
}
