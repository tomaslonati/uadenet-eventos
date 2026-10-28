"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  API_BASE_URL,
  TARIFAS_DEFAULT,
  TODAS_LAS_SEDES,
  crearInscripcionApi,
  fetchEventosApi,
  fetchInscripcionesApi,
  fetchLocacionesApi,
  fetchSaldoApi,
  fetchSedesApi,
  fetchTarifasApi,
  type CategoriaPrecio,
  type Evento,
  type InscripcionApi,
  type LocacionApi,
} from "./api";
import { iniciales } from "./formato";

export type Rol = "admin" | "docente" | "alumno";

export type Usuario = {
  nombre: string;
  mail: string;
  perfil: string;
  iniciales: string;
};

export type CoreAuthUserWeb = {
  id: string;
  email: string;
  careerIds: string[];
  roles: string[];
  permissions: string[];
  status: string;
};

export type ResultadoLoginCore = {
  rol: Rol;
  accessToken: string;
  email: string;
  nombre?: string;
  saldo?: number;
};

const STORAGE_KEY_SESION = "uadenet.core.sesion";

export const DOMINIO_MAIL = "@uadenet.edu";

export const CUENTAS_DEMO = [
  {
    perfil: "Administrativo",
    mail: "m.ibarra@uadenet.edu",
    clave: "admin.2026",
  },
  {
    perfil: "Docente",
    mail: "e.ruiz@uadenet.edu",
    clave: "docente.2026",
  },
  {
    perfil: "Estudiante",
    mail: "t.vidal@uadenet.edu",
    clave: "alumno.2026",
  },
];

export function mapearRolCore(roles: string[], permissions: string[]): Rol {
  if (
    roles.includes("OPERATIONS_ADMIN") ||
    roles.includes("ADMIN") ||
    permissions.includes("campus-events:manage")
  ) {
    return "admin";
  }
  if (roles.includes("TEACHER")) {
    return "docente";
  }
  return "alumno";
}

function perfilDeRol(rol: Rol): string {
  if (rol === "admin") return "Administrativo";
  if (rol === "docente") return "Docente";
  return "Estudiante";
}

/**
 * Autentica contra `POST /api/v1/auth/login` (integrado con CORE IAM) y
 * obtiene el perfil y saldo institucional real desde la API.
 */
export async function autenticarEnCore(
  mail: string,
  clave: string,
): Promise<ResultadoLoginCore | null> {
  const email = mail.trim().toLowerCase();

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password: clave }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      accessToken: string;
      expiresIn: number;
      user: CoreAuthUserWeb;
    };
    const rol = mapearRolCore(
      data.user.roles ?? [],
      data.user.permissions ?? [],
    );

    let nombreRemoto: string | undefined;
    try {
      const usuarioRes = await fetch(`${API_BASE_URL}/api/v1/usuarios/me`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${data.accessToken}`,
        },
      });
      if (usuarioRes.ok) {
        const perfilBo = (await usuarioRes.json()) as { nombre?: string };
        nombreRemoto = perfilBo.nombre;
      }
    } catch {
      // Si Backoffice no devuelve perfil extendido, se usa el identificador de email
    }

    const saldoRemoto = await fetchSaldoApi(data.accessToken).catch(() => null);

    return {
      rol,
      accessToken: data.accessToken,
      email: data.user.email,
      nombre: nombreRemoto,
      saldo: saldoRemoto ?? 0,
    };
  } catch {
    return null;
  }
}

export const INICIO_POR_ROL: Record<Rol, string> = {
  admin: "/gestion",
  docente: "/cartelera",
  alumno: "/cartelera",
};

export type ItemNav = { href: string; label: string; badge?: string };

export function navDe(rol: Rol, inscripciones: number): ItemNav[] {
  const cuenta = { href: "/cuenta", label: "Cuenta institucional" };

  if (rol === "admin") {
    return [
      { href: "/gestion", label: "Eventos" },
      { href: "/eventos/nuevo", label: "Nuevo evento" },
      { href: "/asistencia", label: "Asistencia en vivo", badge: "live" },
      { href: "/cartelera", label: "Cartelera pública" },
      {
        href: "/mis-inscripciones",
        label: "Mis inscripciones",
        badge: String(inscripciones),
      },
      cuenta,
    ];
  }
  if (rol === "docente") {
    return [
      { href: "/cartelera", label: "Cartelera" },
      {
        href: "/mis-inscripciones",
        label: "Mis inscripciones",
        badge: String(inscripciones),
      },
      { href: "/asistencia", label: "Asistencia en vivo", badge: "live" },
      cuenta,
    ];
  }
  return [
    { href: "/cartelera", label: "Cartelera" },
    {
      href: "/mis-inscripciones",
      label: "Mis inscripciones",
      badge: String(inscripciones),
    },
    cuenta,
  ];
}

type Sesion = {
  rol: Rol;
  usuario: Usuario;
  accessToken: string | null;
  ingresar: (rol: Rol, datosCore: ResultadoLoginCore) => void;
  cerrarSesion: () => Promise<void>;

  sede: string;
  cambiarSede: (sede: string) => void;
  sedes: string[];
  locaciones: LocacionApi[];
  tarifas: Record<CategoriaPrecio, number>;

  eventos: Evento[];
  cargandoDatos: boolean;
  recargarDatos: () => Promise<void>;

  saldo: number;
  refrescarSaldo: () => Promise<void>;

  inscripciones: string[];
  inscripcionesDetalle: InscripcionApi[];
  estaInscripto: (eventoId: string) => boolean;
  inscribir: (evento: Evento) => Promise<void>;

  toast: string | null;
  mostrarToast: (mensaje: string) => void;
};

const SesionContext = createContext<Sesion | null>(null);

const DURACION_TOAST = 2600;

export function SesionProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>("alumno");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emailSesion, setEmailSesion] = useState<string>("usuario@uadenet.edu");
  const [nombreSesion, setNombreSesion] = useState<string>("Usuario UADE");
  const [sede, setSede] = useState<string>(TODAS_LAS_SEDES);
  const [sedes, setSedes] = useState<string[]>([]);
  const [locaciones, setLocaciones] = useState<LocacionApi[]>([]);
  const [tarifas, setTarifas] =
    useState<Record<CategoriaPrecio, number>>(TARIFAS_DEFAULT);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState<boolean>(false);
  const [saldo, setSaldo] = useState<number>(0);
  const [inscripcionesDetalle, setInscripcionesDetalle] = useState<
    InscripcionApi[]
  >([]);
  const [toast, setToast] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((mensaje: string) => {
    setToast(mensaje);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setToast(null), DURACION_TOAST);
  }, []);

  const cargarTodoDesdeApi = useCallback(async (token: string | null) => {
    setCargandoDatos(true);
    try {
      const [
        eventosRemotos,
        inscripcionesRemotas,
        sedesRemotas,
        locacionesRemotas,
        tarifasRemotas,
        saldoRemoto,
      ] = await Promise.all([
        fetchEventosApi(token).catch(() => []),
        fetchInscripcionesApi(token).catch(() => []),
        fetchSedesApi(token).catch(() => []),
        fetchLocacionesApi(token).catch(() => []),
        fetchTarifasApi(token).catch(() => TARIFAS_DEFAULT),
        fetchSaldoApi(token).catch(() => null),
      ]);

      setEventos(eventosRemotos);
      setInscripcionesDetalle(inscripcionesRemotas);
      if (sedesRemotas.length > 0) {
        setSedes(sedesRemotas.map((s) => s.nombre));
      } else if (locacionesRemotas.length > 0) {
        setSedes(Array.from(new Set(locacionesRemotas.map((l) => l.sede))));
      }
      setLocaciones(locacionesRemotas);
      setTarifas(tarifasRemotas);
      if (saldoRemoto !== null) {
        setSaldo(saldoRemoto);
      }
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  const recargarDatos = useCallback(async () => {
    await cargarTodoDesdeApi(accessToken);
  }, [accessToken, cargarTodoDesdeApi]);

  const refrescarSaldo = useCallback(async () => {
    const nuevo = await fetchSaldoApi(accessToken).catch(() => null);
    if (nuevo !== null) {
      setSaldo(nuevo);
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelado = false;

    const rehidratar = async () => {
      try {
        const guardado = sessionStorage.getItem(STORAGE_KEY_SESION);
        if (!guardado) {
          await cargarTodoDesdeApi(null);
          return;
        }
        const parsed = JSON.parse(guardado) as ResultadoLoginCore;
        if (!parsed?.rol || !parsed?.accessToken) {
          await cargarTodoDesdeApi(null);
          return;
        }

        let rolVerificado = parsed.rol;
        let emailVerificado = parsed.email;

        try {
          const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${parsed.accessToken}`,
            },
          });
          if (meRes.ok) {
            const user = (await meRes.json()) as CoreAuthUserWeb;
            rolVerificado = mapearRolCore(
              user.roles ?? [],
              user.permissions ?? [],
            );
            emailVerificado = user.email;
          }
        } catch {
          // Si no se puede refrescar /auth/me, conservar token actual
        }

        if (cancelado) return;
        setRol(rolVerificado);
        setAccessToken(parsed.accessToken);
        setEmailSesion(emailVerificado);
        setNombreSesion(
          parsed.nombre ?? emailVerificado.split("@")[0] ?? "Usuario UADE",
        );
        if (parsed.saldo !== undefined) {
          setSaldo(parsed.saldo);
        }

        await cargarTodoDesdeApi(parsed.accessToken);
      } catch {
        // Ignorar errores de sessionStorage
      }
    };

    void rehidratar();

    return () => {
      cancelado = true;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [cargarTodoDesdeApi]);

  const ingresar = useCallback(
    (nuevoRol: Rol, datosCore: ResultadoLoginCore) => {
      setRol(nuevoRol);
      setAccessToken(datosCore.accessToken);
      setEmailSesion(datosCore.email);
      setNombreSesion(
        datosCore.nombre ?? datosCore.email.split("@")[0] ?? "Usuario UADE",
      );
      if (datosCore.saldo !== undefined) {
        setSaldo(datosCore.saldo);
      }

      try {
        sessionStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(datosCore));
      } catch {
        // Ignorar errores de sessionStorage
      }

      void cargarTodoDesdeApi(datosCore.accessToken);
    },
    [cargarTodoDesdeApi],
  );

  const cerrarSesion = useCallback(async () => {
    const tokenActual = accessToken;
    setAccessToken(null);
    setEventos([]);
    setInscripcionesDetalle([]);
    setSaldo(0);
    try {
      sessionStorage.removeItem(STORAGE_KEY_SESION);
    } catch {
      // Ignorar errores de sessionStorage
    }

    if (tokenActual) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenActual}`,
          },
          credentials: "include",
        });
      } catch {
        // Ignorar errores de red al cerrar sesión
      }
    }
  }, [accessToken]);

  const inscribir = useCallback(
    async (evento: Evento) => {
      await crearInscripcionApi(evento.id, accessToken);
      await cargarTodoDesdeApi(accessToken);
    },
    [accessToken, cargarTodoDesdeApi],
  );

  const inscripciones = useMemo(() => {
    const idsPorDetalle = inscripcionesDetalle.map((i) => i.eventoId);
    const idsPorEvento = eventos
      .filter((e) => e.yaInscripto)
      .map((e) => e.id);
    return Array.from(new Set([...idsPorDetalle, ...idsPorEvento]));
  }, [inscripcionesDetalle, eventos]);

  const valor = useMemo<Sesion>(() => {
    const perfil = perfilDeRol(rol);

    return {
      rol,
      usuario: {
        nombre: nombreSesion,
        mail: emailSesion,
        perfil,
        iniciales: iniciales(nombreSesion),
      },
      accessToken,
      ingresar,
      cerrarSesion,

      sede,
      cambiarSede: setSede,
      sedes,
      locaciones,
      tarifas,

      eventos,
      cargandoDatos,
      recargarDatos,

      saldo,
      refrescarSaldo,

      inscripciones,
      inscripcionesDetalle,
      estaInscripto: (eventoId) => inscripciones.includes(eventoId),
      inscribir,

      toast,
      mostrarToast,
    };
  }, [
    rol,
    nombreSesion,
    emailSesion,
    accessToken,
    ingresar,
    cerrarSesion,
    sede,
    sedes,
    locaciones,
    tarifas,
    eventos,
    cargandoDatos,
    recargarDatos,
    saldo,
    refrescarSaldo,
    inscripciones,
    inscripcionesDetalle,
    inscribir,
    toast,
    mostrarToast,
  ]);

  return (
    <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) {
    throw new Error("useSesion tiene que usarse dentro de <SesionProvider>");
  }
  return sesion;
}
