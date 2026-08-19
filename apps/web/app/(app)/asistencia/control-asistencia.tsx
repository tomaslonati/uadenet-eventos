"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/boton";
import { Segmentado } from "@/components/ui/controles";
import { Encabezado } from "@/components/ui/pantalla";
import { horario, iniciales } from "@/lib/formato";
import type { Evento } from "@/lib/mock/eventos";
import { PADRON } from "@/lib/mock/personas";
import { useSesion } from "@/lib/sesion";

import estilos from "./asistencia.module.css";

type Metodo = "qr" | "codigo" | "manual";

const METODOS: { valor: Metodo; label: string }[] = [
  { valor: "qr", label: "Credencial QR" },
  { valor: "codigo", label: "Código en sala" },
  { valor: "manual", label: "Lista manual" },
];

/** El código proyectado en sala rota cada minuto. */
const ROTACION_CODIGO = 60;
const PRIMER_INGRESO = 9 * 60 + 6;
const MINUTOS_ENTRE_INGRESOS = 3;

function hora(minutosDelDia: number): string {
  const hh = String(Math.floor(minutosDelDia / 60)).padStart(2, "0");
  const mm = String(minutosDelDia % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ControlAsistencia({ evento }: { evento: Evento }) {
  const { mostrarToast } = useSesion();
  const [metodo, setMetodo] = useState<Metodo>("qr");
  const [acreditados, setAcreditados] = useState<number[]>([]);
  const [segundos, setSegundos] = useState(42);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundos((actual) => (actual > 0 ? actual - 1 : ROTACION_CODIGO - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const acreditar = (indice: number) => {
    const persona = PADRON[indice];
    if (!persona) return;
    if (acreditados.includes(indice)) {
      mostrarToast("Esa credencial ya fue usada para ingresar.");
      return;
    }
    setAcreditados((actuales) => [...actuales, indice]);
    mostrarToast(`Ingreso registrado: ${persona.nombre}`);
  };

  const pendientes = PADRON.map((persona, indice) => ({ persona, indice }))
    .filter(({ indice }) => !acreditados.includes(indice))
    .slice(0, 4);

  const ingresos = acreditados
    .flatMap((indice, orden) => {
      const persona = PADRON[indice];
      if (!persona) return [];
      return [
        {
          persona,
          hora: hora(PRIMER_INGRESO + orden * MINUTOS_ENTRE_INGRESOS),
        },
      ];
    })
    .reverse();

  const tasa = evento.inscriptos
    ? Math.round((acreditados.length / evento.inscriptos) * 100)
    : 0;

  return (
    <>
      <Encabezado
        antetitulo="Control de asistencia · en curso"
        titulo={evento.titulo}
        bajada={`${evento.sede} — ${evento.locacion} · ${horario(evento.desde, evento.hasta)}`}
        accion={
          <Segmentado
            etiqueta="Método de acreditación"
            opciones={METODOS}
            activa={metodo}
            onCambio={setMetodo}
          />
        }
      />

      <div className={estilos.kpis}>
        <div className={estilos.kpi}>
          <div className={estilos.kpiTextos}>
            <span className={estilos.kpiClave}>Acreditados</span>
            <span className={estilos.kpiSub}>
              sobre {evento.inscriptos} inscriptos
            </span>
          </div>
          <span className={`${estilos.kpiValor} ${estilos.kpiValorExito}`}>
            {acreditados.length}
          </span>
        </div>
        <div className={estilos.kpi}>
          <div className={estilos.kpiTextos}>
            <span className={estilos.kpiClave}>Tasa de asistencia</span>
            <span className={estilos.kpiSub}>
              se cierra al finalizar el evento
            </span>
          </div>
          <span className={estilos.kpiValor}>{tasa}%</span>
        </div>
      </div>

      <div className={estilos.layout}>
        <div className={estilos.metodo}>
          {metodo === "qr" ? (
            <>
              <span className={estilos.metodoTitulo}>Escáner en puerta</span>
              <p className={estilos.metodoTexto}>
                El asistente muestra la credencial de su portal; el staff la lee
                con la tablet de acceso. Cada código se marca usado al primer
                escaneo.
              </p>
              <div className={estilos.escaner} aria-hidden>
                <div className={estilos.escanerMarco} />
                <div className={estilos.escanerLinea} />
              </div>
              <Boton
                variante="primario"
                bloque
                onClick={() => acreditar(acreditados.length % PADRON.length)}
              >
                Simular escaneo
              </Boton>
            </>
          ) : null}

          {metodo === "codigo" ? (
            <>
              <span className={estilos.metodoTitulo}>Código en pantalla</span>
              <p className={estilos.metodoTexto}>
                Se proyecta en la sala y rota cada 60 segundos. Sirve para
                eventos masivos donde no hay control en puerta.
              </p>
              <div className={estilos.codigoPanel}>
                <span className={estilos.codigo}>
                  4{700 + (segundos % 90)}2
                </span>
                <span className={estilos.codigoRestante}>
                  Se renueva en 00:{String(segundos).padStart(2, "0")}
                </span>
              </div>
              <Boton
                variante="primario"
                bloque
                onClick={() => acreditar(acreditados.length % PADRON.length)}
              >
                Simular ingreso de código
              </Boton>
            </>
          ) : null}

          {metodo === "manual" ? (
            <>
              <span className={estilos.metodoTitulo}>Lista manual</span>
              <p className={estilos.metodoTexto}>
                Respaldo offline: el operador tilda a mano y la lista se
                sincroniza cuando vuelve la conexión.
              </p>
              <div className={estilos.pendientes}>
                {pendientes.map(({ persona, indice }) => (
                  <button
                    key={persona.legajo}
                    type="button"
                    className={estilos.pendiente}
                    onClick={() => acreditar(indice)}
                  >
                    <span className={estilos.casilla} />
                    <span className={estilos.pendienteDatos}>
                      <span className={estilos.pendienteNombre}>
                        {persona.nombre}
                      </span>
                      <span className={estilos.pendienteLegajo}>
                        {persona.legajo}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className={estilos.registro}>
          <div className={estilos.registroHeader}>
            <span className={estilos.registroTitulo}>Ingresos registrados</span>
            <span className={estilos.registroCuenta}>
              {acreditados.length} de {evento.inscriptos}
            </span>
          </div>

          {ingresos.length === 0 ? (
            <div className={estilos.sinIngresos}>
              <span className={estilos.sinIngresosTitulo}>
                Todavía no ingresó nadie.
              </span>
              <span className={estilos.sinIngresosTexto}>
                Los registros aparecen acá en tiempo real.
              </span>
            </div>
          ) : (
            ingresos.map((ingreso) => (
              <div key={ingreso.persona.legajo} className={estilos.fila}>
                <span className={estilos.iniciales} aria-hidden>
                  {iniciales(ingreso.persona.nombre)}
                </span>
                <span className={estilos.filaDatos}>
                  <span className={estilos.filaNombre}>
                    {ingreso.persona.nombre}
                  </span>
                  <span className={estilos.filaLegajo}>
                    {ingreso.persona.legajo} · {ingreso.persona.rol}
                  </span>
                </span>
                <span className={estilos.filaHora}>{ingreso.hora}</span>
                <span className={estilos.validado}>
                  <Badge tono="exito">Validado</Badge>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
