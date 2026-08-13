"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { INICIO_POR_ROL, ROLES, useSesion, type Rol } from "@/lib/sesion";

import estilos from "./login.module.css";

const CIFRAS = [
  { valor: "3", label: "sedes activas" },
  { valor: "48", label: "eventos este cuatrimestre" },
  { valor: "6.204", label: "inscripciones" },
];

export default function Login() {
  const router = useRouter();
  const { ingresar } = useSesion();
  const [mail, setMail] = useState("m.ibarra");
  const [perfil, setPerfil] = useState<Rol>("admin");

  const entrar = (evento: FormEvent) => {
    evento.preventDefault();
    ingresar(perfil);
    router.push(INICIO_POR_ROL[perfil]);
  };

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.panel}>
        <span className={estilos.wordmark}>UADEnet</span>
        <div className={estilos.panelTextos}>
          <h1 className={estilos.titulo}>
            Eventos
            <br />
            académicos
          </h1>
          <p className={estilos.bajada}>
            Un solo lugar para programar, difundir, cobrar y registrar la
            asistencia a jornadas, workshops y congresos de todas las sedes.
          </p>
          <div className={estilos.cifras}>
            {CIFRAS.map((cifra) => (
              <div key={cifra.label} className={estilos.cifra}>
                <span className={estilos.cifraValor}>{cifra.valor}</span>
                <span className={estilos.cifraLabel}>{cifra.label}</span>
              </div>
            ))}
          </div>
        </div>
        <span className={estilos.pie}>
          Prototipo · Módulo de Eventos Académicos
        </span>
      </div>

      <div className={estilos.formulario}>
        <form className={estilos.form} onSubmit={entrar}>
          <div className={estilos.formEncabezado}>
            <h2 className={estilos.formTitulo}>Ingresar</h2>
            <p className={estilos.formBajada}>
              Usá tu cuenta institucional. El acceso se valida contra el
              directorio de la universidad.
            </p>
          </div>

          <div className={estilos.grupo}>
            <label className={estilos.label} htmlFor="mail">
              Mail institucional
            </label>
            <div className={estilos.mail}>
              <input
                id="mail"
                className={estilos.mailInput}
                value={mail}
                onChange={(evento) => setMail(evento.target.value)}
                autoComplete="username"
              />
              <span className={estilos.mailDominio}>@uadenet.edu</span>
            </div>
          </div>

          <div className={estilos.grupo}>
            <span className={estilos.label}>Perfil detectado</span>
            <div className={estilos.perfiles}>
              {ROLES.map((opcion) => (
                <button
                  key={opcion.rol}
                  type="button"
                  aria-pressed={opcion.rol === perfil}
                  className={`${estilos.perfil} ${
                    opcion.rol === perfil ? estilos.perfilActivo : ""
                  }`}
                  onClick={() => setPerfil(opcion.rol)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
            <p className={estilos.nota}>
              En producción el perfil llega del SSO; acá lo elegís para recorrer
              el prototipo.
            </p>
          </div>

          <button type="submit" className={estilos.continuar}>
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
