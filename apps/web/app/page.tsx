"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  CUENTAS_DEMO,
  DOMINIO_MAIL,
  INICIO_POR_ROL,
  autenticar,
  useSesion,
} from "@/lib/sesion";

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
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState(false);

  const entrar = (evento: FormEvent) => {
    evento.preventDefault();
    const rol = autenticar(`${mail}${DOMINIO_MAIL}`, contrasena);
    if (!rol) {
      setError(true);
      return;
    }
    ingresar(rol);
    router.push(INICIO_POR_ROL[rol]);
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
            <div className={`${estilos.mail} ${error ? estilos.enError : ""}`}>
              <input
                id="mail"
                className={estilos.mailInput}
                value={mail}
                onChange={(evento) => {
                  setMail(evento.target.value);
                  setError(false);
                }}
                autoComplete="username"
                aria-invalid={error}
                required
              />
              <span className={estilos.mailDominio}>{DOMINIO_MAIL}</span>
            </div>
          </div>

          <div className={estilos.grupo}>
            <label className={estilos.label} htmlFor="contrasena">
              Contraseña
            </label>
            <input
              id="contrasena"
              type="password"
              className={`${estilos.control} ${error ? estilos.enError : ""}`}
              value={contrasena}
              onChange={(evento) => {
                setContrasena(evento.target.value);
                setError(false);
              }}
              autoComplete="current-password"
              aria-invalid={error}
              required
            />
            {error ? (
              <p className={estilos.error} role="alert">
                No pudimos validar esos datos contra el directorio. Revisá el
                mail y la contraseña.
              </p>
            ) : (
              <p className={estilos.nota}>
                El perfil sale de la cuenta con la que entrás; en producción
                llega en la cookie de sesión.
              </p>
            )}
          </div>

          <button type="submit" className={estilos.continuar}>
            Continuar
          </button>

          <div className={estilos.cuentas}>
            <span className={estilos.cuentasTitulo}>Cuentas del prototipo</span>
            {CUENTAS_DEMO.map((cuenta) => (
              <span key={cuenta.mail} className={estilos.cuenta}>
                <span className={estilos.cuentaPerfil}>{cuenta.perfil}</span>
                <span className={estilos.cuentaDatos}>
                  {cuenta.mail.replace(DOMINIO_MAIL, "")} · {cuenta.clave}
                </span>
              </span>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
