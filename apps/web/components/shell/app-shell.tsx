"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Select } from "@/components/ui/select";
import { pesos } from "@/lib/formato";
import { SEDES, TODAS_LAS_SEDES } from "@/lib/mock/eventos";
import { navDe, useSesion } from "@/lib/sesion";

import { PanelAvisos } from "./panel-avisos";

import estilos from "./app-shell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { rol, usuario, sede, cambiarSede, saldo, inscripciones, sinLeer } =
    useSesion();
  const [avisosAbiertos, setAvisosAbiertos] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const campana = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const nav = navDe(rol, inscripciones.length, sinLeer);

  useEffect(() => {
    if (!menuAbierto) return;
    const alApretarAfuera = (evento: PointerEvent) => {
      if (!menu.current?.contains(evento.target as Node)) setMenuAbierto(false);
    };
    const alSoltarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("pointerdown", alApretarAfuera);
    document.addEventListener("keydown", alSoltarTecla);
    return () => {
      document.removeEventListener("pointerdown", alApretarAfuera);
      document.removeEventListener("keydown", alSoltarTecla);
    };
  }, [menuAbierto]);

  return (
    <div className={estilos.shell}>
      <header className={estilos.header}>
        <span className={estilos.wordmark}>UADEnet</span>
        <span className={estilos.divisor} />
        <div className={estilos.sede}>
          <span className={estilos.sedeLabel}>Sede</span>
          <Select
            etiqueta="Sede"
            className={estilos.sedeSelect}
            valor={sede}
            opciones={[TODAS_LAS_SEDES, ...SEDES]}
            onCambiar={cambiarSede}
          />
        </div>

        <div className={estilos.espacio} />

        <button
          ref={campana}
          type="button"
          className={estilos.campana}
          aria-label={`Avisos, ${sinLeer} sin leer`}
          aria-expanded={avisosAbiertos}
          onClick={() => setAvisosAbiertos((abierto) => !abierto)}
        >
          <span className={estilos.campanaIcono} />
          {sinLeer > 0 ? <span className={estilos.campanaPunto} /> : null}
        </button>

        <div ref={menu} className={estilos.menuUsuario}>
          <button
            type="button"
            className={estilos.usuario}
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <span className={estilos.avatar} aria-hidden>
              {usuario.iniciales}
            </span>
            <span className={estilos.usuarioDatos}>
              <span className={estilos.usuarioNombre}>{usuario.nombre}</span>
              <span className={estilos.usuarioMail}>{usuario.mail}</span>
            </span>
            <span className={estilos.usuarioFlecha} aria-hidden />
          </button>

          {menuAbierto ? (
            <div className={estilos.menu} role="menu">
              <Link
                href="/"
                role="menuitem"
                className={estilos.menuItem}
                onClick={() => setMenuAbierto(false)}
              >
                Cerrar sesión
              </Link>
            </div>
          ) : null}
        </div>
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
        <PanelAvisos
          onCerrar={() => setAvisosAbiertos(false)}
          disparador={campana}
        />
      ) : null}
    </div>
  );
}
