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
import { AVISOS } from "./mock/avisos";
import { TODAS_LAS_SEDES, type Evento } from "./mock/eventos";

export type Rol = "admin" | "docente" | "alumno";

export type Usuario = {
  nombre: string;
  mail: string;
  perfil: string;
  iniciales: string;
};

const USUARIOS: Record<Rol, Omit<Usuario, "iniciales">> = {
  admin: {
    nombre: "Mariana Ibarra",
    mail: "m.ibarra@uadenet.edu",
    perfil: "Administrativo",
  },
  docente: {
    nombre: "Dr. Esteban Ruiz",
    mail: "e.ruiz@uadenet.edu",
    perfil: "Docente",
  },
  alumno: {
    nombre: "Tomás Vidal",
    mail: "t.vidal@uadenet.edu",
    perfil: "Estudiante",
  },
};

export const ROLES: { rol: Rol; label: string }[] = [
  { rol: "admin", label: "Administrativo" },
  { rol: "docente", label: "Docente" },
  { rol: "alumno", label: "Estudiante" },
];

export const INICIO_POR_ROL: Record<Rol, string> = {
  admin: "/gestion",
  docente: "/docente",
  alumno: "/cartelera",
};

export type ItemNav = { href: string; label: string; badge?: string };

export function navDe(rol: Rol, inscripciones: number, sinLeer: number): ItemNav[] {
  const avisos = { href: "/avisos", label: "Avisos", badge: String(sinLeer) };
  const cuenta = { href: "/cuenta", label: "Cuenta institucional" };

  if (rol === "admin") {
    return [
      { href: "/gestion", label: "Eventos" },
      { href: "/eventos/nuevo", label: "Nuevo evento" },
      { href: "/asistencia", label: "Asistencia en vivo", badge: "live" },
      { href: "/cartelera", label: "Cartelera pública" },
      avisos,
      cuenta,
    ];
  }
  if (rol === "docente") {
    return [
      { href: "/docente", label: "Mis eventos" },
      { href: "/cartelera", label: "Cartelera" },
      {
        href: "/mis-inscripciones",
        label: "Mis inscripciones",
        badge: String(inscripciones),
      },
      { href: "/asistencia", label: "Asistencia en vivo", badge: "live" },
      avisos,
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
    avisos,
    cuenta,
  ];
}

type Sesion = {
  rol: Rol;
  usuario: Usuario;
  ingresar: (rol: Rol) => void;
  cambiarRol: (rol: Rol) => void;

  sede: string;
  cambiarSede: (sede: string) => void;

  saldo: number;
  cargarSaldo: (monto: number) => void;

  inscripciones: string[];
  estaInscripto: (eventoId: string) => boolean;
  inscribir: (evento: Evento, cobrar: boolean) => void;
  reemplazar: (saliente: string, evento: Evento) => void;
  liberar: (eventoId: string) => void;

  avisosLeidos: boolean;
  avisosDescartados: string[];
  sinLeer: number;
  marcarAvisosLeidos: () => void;
  descartarAviso: (avisoId: string) => void;

  toast: string | null;
  mostrarToast: (mensaje: string) => void;
};

const SesionContext = createContext<Sesion | null>(null);

const DURACION_TOAST = 2600;

export function SesionProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>("admin");
  const [sede, setSede] = useState<string>(TODAS_LAS_SEDES);
  const [saldo, setSaldo] = useState(34_750);
  const [inscripciones, setInscripciones] = useState<string[]>(["e1"]);
  const [avisosLeidos, setAvisosLeidos] = useState(false);
  const [avisosDescartados, setAvisosDescartados] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const mostrarToast = useCallback((mensaje: string) => {
    setToast(mensaje);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setToast(null), DURACION_TOAST);
  }, []);

  const valor = useMemo<Sesion>(() => {
    const datos = USUARIOS[rol];
    const sinLeer = avisosLeidos
      ? 0
      : AVISOS.filter(
          (aviso) => aviso.sinLeer && !avisosDescartados.includes(aviso.id),
        ).length;

    return {
      rol,
      usuario: { ...datos, iniciales: iniciales(datos.nombre) },
      ingresar: setRol,
      cambiarRol: setRol,

      sede,
      cambiarSede: setSede,

      saldo,
      cargarSaldo: (monto) => {
        setSaldo((actual) => actual + monto);
      },

      inscripciones,
      estaInscripto: (eventoId) => inscripciones.includes(eventoId),
      inscribir: (evento, cobrar) => {
        setInscripciones((actuales) =>
          actuales.includes(evento.id) ? actuales : [...actuales, evento.id],
        );
        if (cobrar) setSaldo((actual) => actual - evento.precio);
      },
      reemplazar: (saliente, evento) => {
        setInscripciones((actuales) => [
          ...actuales.filter((id) => id !== saliente),
          evento.id,
        ]);
      },
      liberar: (eventoId) => {
        setInscripciones((actuales) =>
          actuales.filter((id) => id !== eventoId),
        );
      },

      avisosLeidos,
      avisosDescartados,
      sinLeer,
      marcarAvisosLeidos: () => setAvisosLeidos(true),
      descartarAviso: (avisoId) => {
        setAvisosDescartados((actuales) => [...actuales, avisoId]);
      },

      toast,
      mostrarToast,
    };
  }, [
    rol,
    sede,
    saldo,
    inscripciones,
    avisosLeidos,
    avisosDescartados,
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
