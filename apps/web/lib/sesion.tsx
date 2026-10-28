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

import { iniciales } from "./formato";
import { TODAS_LAS_SEDES, type Evento } from "./mock/eventos";

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
  accessToken: string | null;
  email: string;
  nombre?: string;
  saldo?: number;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_CORE_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

const STORAGE_KEY_SESION = "uadenet.core.sesion";

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

// Directorio hardcodeado del prototipo: un usuario por rol para poder recorrer
// las tres vistas. Las claves son de demo, no son secretos: cuando el acceso se
// valide de verdad contra el directorio de la universidad, el campo `clave`
// desaparece de acá junto con `autenticar`.
const USUARIOS: Record<Rol, Omit<Usuario, "iniciales"> & { clave: string }> = {
  admin: {
    nombre: "Mariana Ibarra",
    mail: "m.ibarra@uadenet.edu",
    perfil: "Administrativo",
    clave: "admin.2026",
  },
  docente: {
    nombre: "Dr. Esteban Ruiz",
    mail: "e.ruiz@uadenet.edu",
    perfil: "Docente",
    clave: "docente.2026",
  },
  alumno: {
    nombre: "Tomás Vidal",
    mail: "t.vidal@uadenet.edu",
    perfil: "Estudiante",
    clave: "alumno.2026",
  },
};

export const DOMINIO_MAIL = "@uadenet.edu";

/** Estado propio de cada cuenta demo: cambiar de cuenta no debe arrastrar el saldo/inscripciones de la anterior. */
const ESTADO_INICIAL_POR_ROL: Record<
  Rol,
  { saldo: number; inscripciones: string[] }
> = {
  admin: { saldo: 13_000, inscripciones: [] },
  docente: { saldo: 13_000, inscripciones: [] },
  alumno: { saldo: 13_000, inscripciones: ["e1"] },
};

const ROLES = Object.keys(USUARIOS) as Rol[];

// Fallback local para cuando el frontend se recorre desconectado del backend.
export function autenticar(mail: string, clave: string): Rol | null {
  const buscado = mail.trim().toLowerCase();
  const rol = ROLES.find(
    (candidato) =>
      USUARIOS[candidato].mail === buscado &&
      USUARIOS[candidato].clave === clave,
  );
  return rol ?? null;
}

/**
 * Autentica contra `POST /api/v1/auth/login` (integrado con CORE IAM) y
 * consulta el saldo institucional disponible en `GET /api/v1/usuarios/me/saldo`.
 * Si la API no está disponible localmente, aplica fallback al directorio del prototipo.
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

    if (res.status === 401 || res.status === 400) {
      return null;
    }

    if (res.ok) {
      const data = (await res.json()) as {
        accessToken: string;
        expiresIn: number;
        user: CoreAuthUserWeb;
      };
      const rol = mapearRolCore(
        data.user.roles ?? [],
        data.user.permissions ?? [],
      );

      let saldoRemoto: number | undefined;
      try {
        const saldoRes = await fetch(
          `${API_BASE_URL}/api/v1/usuarios/me/saldo`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${data.accessToken}`,
            },
          },
        );
        if (saldoRes.ok) {
          const wallet = (await saldoRes.json()) as { balance?: string };
          const parseado = Number.parseFloat(wallet.balance ?? "");
          if (Number.isFinite(parseado)) {
            saldoRemoto = parseado;
          }
        }
      } catch {
        // Si falla la lectura de saldo, se conserva el saldo inicial del rol.
      }

      const conocido = ROLES.find(
        (c) => USUARIOS[c].mail.toLowerCase() === data.user.email.toLowerCase(),
      );

      return {
        rol,
        accessToken: data.accessToken,
        email: data.user.email,
        nombre: conocido ? USUARIOS[conocido].nombre : undefined,
        saldo: saldoRemoto,
      };
    }
  } catch {
    // Fallback offline para recorrer el prototipo sin backend corriendo
  }

  const rolFallback = autenticar(email, clave);
  if (!rolFallback) {
    return null;
  }
  return {
    rol: rolFallback,
    accessToken: null,
    email: USUARIOS[rolFallback].mail,
    nombre: USUARIOS[rolFallback].nombre,
    saldo: ESTADO_INICIAL_POR_ROL[rolFallback].saldo,
  };
}

export const CUENTAS_DEMO = ROLES.map((rol) => ({
  perfil: USUARIOS[rol].perfil,
  mail: USUARIOS[rol].mail,
  clave: USUARIOS[rol].clave,
}));

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
  ingresar: (rol: Rol, datosCore?: ResultadoLoginCore) => void;
  cerrarSesion: () => Promise<void>;

  sede: string;
  cambiarSede: (sede: string) => void;

  saldo: number;

  inscripciones: string[];
  estaInscripto: (eventoId: string) => boolean;
  inscribir: (evento: Evento, cobrar: boolean) => void;

  toast: string | null;
  mostrarToast: (mensaje: string) => void;
};

const SesionContext = createContext<Sesion | null>(null);

const DURACION_TOAST = 2600;

export function SesionProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>("admin");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emailSesion, setEmailSesion] = useState<string | null>(null);
  const [nombreSesion, setNombreSesion] = useState<string | null>(null);
  const [sede, setSede] = useState<string>(TODAS_LAS_SEDES);
  const [saldo, setSaldo] = useState(ESTADO_INICIAL_POR_ROL.admin.saldo);
  const [inscripciones, setInscripciones] = useState<string[]>(
    ESTADO_INICIAL_POR_ROL.admin.inscripciones,
  );
  const [toast, setToast] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;

    const rehidratar = async () => {
      try {
        const guardado = sessionStorage.getItem(STORAGE_KEY_SESION);
        if (!guardado) return;
        const parsed = JSON.parse(guardado) as ResultadoLoginCore;
        if (!parsed?.rol) return;

        let rolVerificado = parsed.rol;
        let emailVerificado = parsed.email ?? null;

        if (parsed.accessToken) {
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
            // Si la API no responde, se conserva la sesión local
          }
        } else {
          await Promise.resolve();
        }

        if (cancelado) return;
        const inicial = ESTADO_INICIAL_POR_ROL[rolVerificado];
        setRol(rolVerificado);
        setAccessToken(parsed.accessToken ?? null);
        setEmailSesion(emailVerificado);
        setNombreSesion(parsed.nombre ?? null);
        setSaldo(parsed.saldo ?? inicial.saldo);
        setInscripciones(inicial.inscripciones);
      } catch {
        // Ignorar errores de sessionStorage
      }
    };

    void rehidratar();

    return () => {
      cancelado = true;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const mostrarToast = useCallback((mensaje: string) => {
    setToast(mensaje);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setToast(null), DURACION_TOAST);
  }, []);

  const ingresar = useCallback(
    (nuevoRol: Rol, datosCore?: ResultadoLoginCore) => {
      const inicial = ESTADO_INICIAL_POR_ROL[nuevoRol];
      const nuevoSaldo = datosCore?.saldo ?? inicial.saldo;
      setRol(nuevoRol);
      setAccessToken(datosCore?.accessToken ?? null);
      setEmailSesion(datosCore?.email ?? null);
      setNombreSesion(datosCore?.nombre ?? null);
      setSaldo(nuevoSaldo);
      setInscripciones(inicial.inscripciones);

      try {
        sessionStorage.setItem(
          STORAGE_KEY_SESION,
          JSON.stringify(
            datosCore ?? {
              rol: nuevoRol,
              accessToken: null,
              email: USUARIOS[nuevoRol].mail,
              nombre: USUARIOS[nuevoRol].nombre,
              saldo: nuevoSaldo,
            },
          ),
        );
      } catch {
        // Ignorar errores de sessionStorage
      }
    },
    [],
  );

  const cerrarSesion = useCallback(async () => {
    const tokenActual = accessToken;
    setAccessToken(null);
    setEmailSesion(null);
    setNombreSesion(null);
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

  const valor = useMemo<Sesion>(() => {
    const base = USUARIOS[rol];
    const mail = emailSesion ?? base.mail;
    const nombre =
      nombreSesion ??
      (emailSesion && emailSesion !== base.mail
        ? (emailSesion.split("@")[0] ?? base.nombre)
        : base.nombre);
    const perfil = perfilDeRol(rol);

    return {
      rol,
      usuario: {
        nombre,
        mail,
        perfil,
        iniciales: iniciales(nombre),
      },
      accessToken,
      ingresar,
      cerrarSesion,

      sede,
      cambiarSede: setSede,

      saldo,

      inscripciones,
      estaInscripto: (eventoId) => inscripciones.includes(eventoId),
      inscribir: (evento, cobrar) => {
        setInscripciones((actuales) =>
          actuales.includes(evento.id) ? actuales : [...actuales, evento.id],
        );
        if (cobrar) setSaldo((actual) => actual - evento.precio);
      },

      toast,
      mostrarToast,
    };
  }, [
    rol,
    accessToken,
    emailSesion,
    nombreSesion,
    sede,
    saldo,
    inscripciones,
    toast,
    mostrarToast,
    ingresar,
    cerrarSesion,
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
