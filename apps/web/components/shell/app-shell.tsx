"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { pesos } from "@/lib/formato";
import { SEDES, TODAS_LAS_SEDES } from "@/lib/mock/eventos";
import {
  INICIO_POR_ROL,
  ROLES,
  navDe,
  useSesion,
  type Rol,
} from "@/lib/sesion";

import { PanelAvisos } from "./panel-avisos";

import estilos from "./app-shell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    rol,
    usuario,
    cambiarRol,
    sede,
    cambiarSede,
    saldo,
    inscripciones,
    sinLeer,
  } = useSesion();
  const [avisosAbiertos, setAvisosAbiertos] = useState(false);

  const nav = navDe(rol, inscripciones.length, sinLeer);

  const cambiarPerfil = (nuevo: Rol) => {
    cambiarRol(nuevo);
    router.push(INICIO_POR_ROL[nuevo]);
  };

  return (
    <div className={estilos.shell}>
      <header className={estilos.header}>
        <span className={estilos.wordmark}>UADEnet</span>
        <span className={estilos.divisor} />
        <div className={estilos.sede}>
          <label className={estilos.sedeLabel} htmlFor="selector-sede">
            Sede
          </label>
          <select
            id="selector-sede"
            className={estilos.sedeSelect}
            value={sede}
            onChange={(evento) => cambiarSede(evento.target.value)}
          >
            {[TODAS_LAS_SEDES, ...SEDES].map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </div>

        <div className={estilos.espacio} />

        <div className={estilos.perfiles} role="group" aria-label="Perfil activo">
          {ROLES.map((opcion) => (
            <button
              key={opcion.rol}
              type="button"
              aria-pressed={opcion.rol === rol}
              className={`${estilos.perfil} ${opcion.rol === rol ? estilos.perfilActivo : ""}`}
              onClick={() => cambiarPerfil(opcion.rol)}
            >
              {opcion.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={estilos.campana}
          aria-label={`Avisos, ${sinLeer} sin leer`}
          aria-expanded={avisosAbiertos}
          onClick={() => setAvisosAbiertos((abierto) => !abierto)}
        >
          <span className={estilos.campanaIcono} />
          {sinLeer > 0 ? <span className={estilos.campanaPunto} /> : null}
        </button>

        <div className={estilos.usuario}>
          <span className={estilos.avatar} aria-hidden>
            {usuario.iniciales}
          </span>
          <span className={estilos.usuarioDatos}>
            <span className={estilos.usuarioNombre}>{usuario.nombre}</span>
            <span className={estilos.usuarioMail}>{usuario.mail}</span>
          </span>
        </div>

        <Link href="/" className={estilos.salir}>
          Salir
        </Link>
      </header>

      <div className={estilos.cuerpo}>
        <nav className={estilos.sidebar} aria-label="Secciones del módulo">
          <span className={estilos.sidebarPerfil}>{usuario.perfil}</span>
          {nav.map((item) => {
            const activo =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`${estilos.navItem} ${activo ? estilos.navActivo : ""}`}
              >
                <span>{item.label}</span>
                {item.badge && item.badge !== "0" ? (
                  <span
                    className={`${estilos.navBadge} ${
                      item.badge === "live" ? estilos.navBadgeLive : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className={estilos.espacio} />

          <div className={estilos.saldo}>
            <span className={estilos.saldoLabel}>Saldo institucional</span>
            <span className={estilos.saldoMonto}>{pesos(saldo)}</span>
            <Link href="/cuenta" className={estilos.saldoAccion}>
              Ver cuenta
            </Link>
          </div>
        </nav>

        <main className={estilos.main}>
          <div className={estilos.contenido}>{children}</div>
        </main>
      </div>

      {avisosAbiertos ? (
        <PanelAvisos onCerrar={() => setAvisosAbiertos(false)} />
      ) : null}
    </div>
  );
}
