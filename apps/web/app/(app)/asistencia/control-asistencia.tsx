"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { Segmentado } from "@/components/ui/controles";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import {
  fetchAsistenciaEventoApi,
  registrarAsistenciaApi,
  type AsistenteEventoApi,
} from "@/lib/api";
import { horario, iniciales } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./asistencia.module.css";

type Metodo = "qr" | "manual";

const METODOS: { valor: Metodo; label: string }[] = [
  { valor: "qr", label: "Credencial QR" },
  { valor: "manual", label: "Lista manual" },
];

function formatearHora(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ControlAsistencia({ eventoId }: { eventoId?: string }) {
  const {
    accessToken,
    eventos: catalogo,
    cargandoDatos,
    mostrarToast,
  } = useSesion();
  const [metodo, setMetodo] = useState<Metodo>("qr");
  const [codigoQr, setCodigoQr] = useState("");
  const [asistentes, setAsistentes] = useState<AsistenteEventoApi[]>([]);
  const [cargandoPadron, setCargandoPadron] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const evento =
    (eventoId ? catalogo.find((e) => e.id === eventoId) : undefined) ??
    catalogo[0];
  const eventoIdActivo = evento?.id;

  const recargarAsistentes = useCallback(async () => {
    if (!eventoIdActivo) return;
    const lista = await fetchAsistenciaEventoApi(eventoIdActivo, accessToken);
    setAsistentes(lista);
  }, [eventoIdActivo, accessToken]);

  useEffect(() => {
    if (!eventoIdActivo) return;
    let cancelado = false;

    const cargar = async () => {
      try {
        const lista = await fetchAsistenciaEventoApi(
          eventoIdActivo,
          accessToken,
        );
        if (!cancelado) setAsistentes(lista);
      } finally {
        if (!cancelado) setCargandoPadron(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [eventoIdActivo, accessToken]);

  if (!evento) {
    return (
      <EstadoVacio
        texto={
          cargandoDatos
            ? "Cargando evento para control de asistencia…"
            : "No hay eventos publicados para tomar asistencia."
        }
      />
    );
  }

  const pendientes = asistentes.filter((a) => !a.acreditado);
  const ingresos = asistentes
    .filter((a) => a.acreditado)
    .slice()
    .sort((a, b) =>
      (b.asistencia?.confirmadaEn ?? "").localeCompare(
        a.asistencia?.confirmadaEn ?? "",
      ),
    );

  const totalInscriptos = asistentes.length || evento.inscriptos;
  const tasa = totalInscriptos
    ? Math.round((ingresos.length / totalInscriptos) * 100)
    : 0;

  const acreditarInscripcion = async (
    inscripcionId: string,
    via: Metodo,
    nombre?: string,
  ) => {
    if (registrando) return;
    setRegistrando(true);
    try {
      await registrarAsistenciaApi(inscripcionId, via, accessToken);
      setCodigoQr("");
      await recargarAsistentes();
      mostrarToast(
        nombre ? `Ingreso registrado: ${nombre}` : "Ingreso registrado",
      );
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la asistencia.",
      );
    } finally {
      setRegistrando(false);
    }
  };

  const escanearQr = () => {
    const limpio = codigoQr.trim();
    if (limpio) {
      const encontrado = asistentes.find((a) => a.inscripcionId === limpio);
      void acreditarInscripcion(limpio, "qr", encontrado?.usuario.nombre);
      return;
    }
    const siguiente = pendientes[0];
    if (!siguiente) {
      mostrarToast(
        asistentes.length === 0
          ? "No hay inscriptos en este evento todavía."
          : "Todos los inscriptos ya fueron acreditados.",
      );
      return;
    }
    void acreditarInscripcion(
      siguiente.inscripcionId,
      "qr",
      siguiente.usuario.nombre,
    );
  };

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
              sobre {totalInscriptos} inscriptos
            </span>
          </div>
          <span className={`${estilos.kpiValor} ${estilos.kpiValorExito}`}>
            {ingresos.length}
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
                El asistente muestra la credencial de su portal; pegá el código
                UUID de la credencial o escaneá el próximo inscripto pendiente.
              </p>
              <div className={estilos.escaner} aria-hidden>
                <div className={estilos.escanerMarco} />
                <div className={estilos.escanerLinea} />
              </div>
              <input
                className={claseControl}
                placeholder="Código de credencial (UUID de inscripción)"
                value={codigoQr}
                onChange={(e) => setCodigoQr(e.target.value)}
              />
              <Boton
                variante="primario"
                bloque
                disabled={registrando}
                onClick={escanearQr}
              >
                {registrando
                  ? "Validando credencial…"
                  : codigoQr.trim()
                    ? "Validar credencial"
                    : "Escanear siguiente pendiente"}
              </Boton>
            </>
          ) : null}

          {metodo === "manual" ? (
            <>
              <span className={estilos.metodoTitulo}>Lista manual</span>
              <p className={estilos.metodoTexto}>
                Padrón real de inscriptos al evento consultado desde la API.
              </p>
              <div className={estilos.pendientes}>
                {cargandoPadron && pendientes.length === 0 ? (
                  <p className={estilos.metodoTexto}>Cargando padrón…</p>
                ) : pendientes.length === 0 ? (
                  <p className={estilos.metodoTexto}>
                    No quedan inscriptos pendientes de acreditar.
                  </p>
                ) : (
                  pendientes.map((item) => (
                    <button
                      key={item.inscripcionId}
                      type="button"
                      className={estilos.pendiente}
                      disabled={registrando}
                      onClick={() =>
                        void acreditarInscripcion(
                          item.inscripcionId,
                          "manual",
                          item.usuario.nombre,
                        )
                      }
                    >
                      <span className={estilos.casilla} />
                      <span className={estilos.pendienteDatos}>
                        <span className={estilos.pendienteNombre}>
                          {item.usuario.nombre}
                        </span>
                        <span className={estilos.pendienteLegajo}>
                          {item.usuario.email}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className={estilos.registro}>
          <div className={estilos.registroHeader}>
            <span className={estilos.registroTitulo}>Ingresos registrados</span>
            <span className={estilos.registroCuenta}>
              {ingresos.length} de {totalInscriptos}
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
              <div key={ingreso.inscripcionId} className={estilos.fila}>
                <span className={estilos.iniciales} aria-hidden>
                  {iniciales(ingreso.usuario.nombre)}
                </span>
                <span className={estilos.filaDatos}>
                  <span className={estilos.filaNombre}>
                    {ingreso.usuario.nombre}
                  </span>
                  <span className={estilos.filaLegajo}>
                    {ingreso.usuario.email} · {ingreso.usuario.rol}
                  </span>
                </span>
                <span className={estilos.filaHora}>
                  {formatearHora(ingreso.asistencia?.confirmadaEn)}
                </span>
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
