"use client";

import { MAX_LARGO_MOTIVO_CANCELACION } from "@repo/contracts";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton, BotonLink } from "@/components/ui/boton";
import { Campo, claseControl } from "@/components/ui/campo";
import {
  Modal,
  ModalConfirmacion,
  ModalCuerpo,
  ModalHeader,
  ModalPie,
} from "@/components/ui/modal";
import {
  cancelarEventoApi,
  fetchAsistenciaEventoApi,
  fetchImpactoEventoApi,
  type AsistenteEventoApi,
  type Evento,
  type ImpactoEventoApi,
  type ResultadoCancelacionEventoApi,
} from "@/lib/api";
import { puedeGestionar } from "@/lib/dominio";
import { numero, pesos } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./panel-organizador.module.css";

const ROL: Record<AsistenteEventoApi["usuario"]["rol"], string> = {
  estudiante: "Estudiante",
  docente: "Docente",
  administrativo: "Administrativo",
};

function celdaCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** CSV con BOM para que Excel respete las tildes. */
function descargarCsv(evento: Evento, asistentes: AsistenteEventoApi[]) {
  const filas = [
    ["Nombre", "Mail", "Rol", "Asistencia", "Método", "Confirmada"],
    ...asistentes.map((a) => [
      a.usuario.nombre,
      a.usuario.email,
      ROL[a.usuario.rol],
      a.acreditado ? "Presente" : "Ausente",
      a.asistencia?.metodo ?? "",
      a.asistencia?.confirmadaEn ?? "",
    ]),
  ];
  const contenido = filas.map((fila) => fila.map(celdaCsv).join(",")).join("\r\n");
  const blob = new Blob([`﻿${contenido}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `inscriptos-${evento.id.slice(0, 8)}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Lo que ve y puede hacer quien creó el evento: seguimiento de inscriptos y
 * presentismo, y las acciones que cambian el evento (editar, cancelar).
 */
export function PanelOrganizador({ evento }: { evento: Evento }) {
  const { accessToken, recargarDatos, mostrarToast } = useSesion();
  const [asistentes, setAsistentes] = useState<AsistenteEventoApi[] | null>(null);
  const [impacto, setImpacto] = useState<ImpactoEventoApi | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);

  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCancelacionEventoApi | null>(
    null,
  );

  const cancelado = evento.estadoPublicacion === "cancelado";

  const cargar = useCallback(async () => {
    try {
      const [lista, resumen] = await Promise.all([
        fetchAsistenciaEventoApi(evento.id, accessToken),
        fetchImpactoEventoApi(evento.id, accessToken),
      ]);
      setAsistentes(lista);
      setImpacto(resumen);
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    }
  }, [evento.id, accessToken]);

  // Se vuelve a pedir cuando cambia la cantidad de inscriptos o el estado del evento.
  const inscriptosActuales = evento.inscriptos;
  const estadoActual = evento.estadoPublicacion;
  useEffect(() => {
    let vigente = true;
    void Promise.all([
      fetchAsistenciaEventoApi(evento.id, accessToken),
      fetchImpactoEventoApi(evento.id, accessToken),
    ])
      .then(([lista, resumen]) => {
        if (!vigente) return;
        setAsistentes(lista);
        setImpacto(resumen);
        setErrorCarga(false);
      })
      .catch(() => {
        if (vigente) setErrorCarga(true);
      });
    return () => {
      vigente = false;
    };
  }, [evento.id, accessToken, inscriptosActuales, estadoActual]);

  const acreditados = asistentes?.filter((a) => a.acreditado).length ?? 0;
  const total = impacto?.inscriptos ?? 0;
  const presentismo = total > 0 ? Math.round((acreditados / total) * 100) : 0;

  const motivoNoGestionable = cancelado
    ? "El evento ya está cancelado."
    : !puedeGestionar(evento)
      ? "El evento ya empezó."
      : impacto && impacto.asistenciasRegistradas > 0
        ? "Ya hay asistencias registradas."
        : null;

  const confirmarCancelacion = async () => {
    if (procesando || !motivo.trim()) return;
    setProcesando(true);
    try {
      const res = await cancelarEventoApi(evento.id, motivo.trim(), accessToken);
      setResultado(res);
      setConfirmando(false);
      await recargarDatos();
      await cargar();
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : "No se pudo cancelar el evento.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const reintentarReembolsos = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      const res = await cancelarEventoApi(
        evento.id,
        evento.motivoCancelacion ?? "Evento cancelado",
        accessToken,
      );
      setResultado(res);
      await cargar();
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : "No se pudieron reintentar los reembolsos.",
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section className={estilos.panel} aria-label="Gestión del evento">
      <div className={estilos.encabezado}>
        <span className={estilos.titulo}>Gestión del evento</span>
        <div className={estilos.acciones}>
          {!cancelado && puedeGestionar(evento) ? (
            <BotonLink href={`/eventos/${evento.id}/editar`} tamano="sm">
              Editar evento
            </BotonLink>
          ) : null}
          {!cancelado ? (
            <BotonLink href={`/asistencia?evento=${evento.id}`} tamano="sm">
              Tomar asistencia
            </BotonLink>
          ) : null}
          {asistentes && asistentes.length > 0 ? (
            <Boton tamano="sm" onClick={() => descargarCsv(evento, asistentes)}>
              Exportar CSV
            </Boton>
          ) : null}
          {!cancelado ? (
            <Boton
              tamano="sm"
              variante="destructivo"
              disabled={motivoNoGestionable !== null}
              title={motivoNoGestionable ?? undefined}
              onClick={() => setConfirmando(true)}
            >
              Cancelar evento
            </Boton>
          ) : null}
        </div>
      </div>

      {cancelado ? (
        <div className={estilos.cancelado}>
          <strong>Evento cancelado</strong>
          <span>Motivo: {evento.motivoCancelacion ?? "sin motivo informado"}.</span>
          {impacto && impacto.reembolsosPendientes > 0 ? (
            <>
              <span>
                Quedan {impacto.reembolsosPendientes}{" "}
                {impacto.reembolsosPendientes === 1
                  ? "reembolso pendiente"
                  : "reembolsos pendientes"}{" "}
                porque CORE no confirmó la devolución.
              </span>
              <div className={estilos.acciones}>
                <Boton
                  tamano="sm"
                  disabled={procesando}
                  onClick={() => void reintentarReembolsos()}
                >
                  {procesando ? "Reintentando…" : "Reintentar reembolsos"}
                </Boton>
              </div>
            </>
          ) : (
            <span>Todos los reembolsos fueron acreditados.</span>
          )}
        </div>
      ) : motivoNoGestionable ? (
        <p className={estilos.nota}>
          No se puede cancelar: {motivoNoGestionable.toLowerCase()}
        </p>
      ) : null}

      {errorCarga ? (
        <p className={estilos.nota}>
          No pudimos cargar el seguimiento de inscriptos.{" "}
          <button type="button" onClick={() => void cargar()}>
            Reintentar
          </button>
        </p>
      ) : null}

      {!cancelado && impacto ? (
        <div className={estilos.cifras}>
          <div className={estilos.cifra}>
            <span className={estilos.cifraLabel}>Inscriptos</span>
            <span className={estilos.cifraValor}>
              {impacto.inscriptos} / {evento.cupo}
            </span>
            <span className={estilos.cifraSub}>
              {Math.max(evento.cupo - impacto.inscriptos, 0)} lugares libres
            </span>
          </div>
          <div className={estilos.cifra}>
            <span className={estilos.cifraLabel}>Presentes</span>
            <span className={estilos.cifraValor}>{acreditados}</span>
            <span className={estilos.cifraSub}>acreditados en la puerta</span>
          </div>
          <div className={estilos.cifra}>
            <span className={estilos.cifraLabel}>Presentismo</span>
            <span className={estilos.cifraValor}>{presentismo}%</span>
            <span className={estilos.cifraSub}>sobre inscriptos</span>
          </div>
          {evento.categoriaPrecio ? (
            <div className={estilos.cifra}>
              <span className={estilos.cifraLabel}>Recaudado</span>
              <span className={estilos.cifraValor}>
                {pesos(impacto.montoAReembolsar)}
              </span>
              <span className={estilos.cifraSub}>
                {impacto.inscriptosPagos} inscripciones pagas
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!cancelado && asistentes ? (
        asistentes.length > 0 ? (
          <div className={estilos.lista}>
            <div className={`${estilos.fila} ${estilos.filaCabecera}`}>
              <span>Persona</span>
              <span>Mail</span>
              <span>Rol</span>
              <span>Asistencia</span>
            </div>
            {asistentes.map((a) => (
              <div key={a.inscripcionId} className={estilos.fila}>
                <span className={estilos.nombre}>{a.usuario.nombre}</span>
                <span className={estilos.mail}>{a.usuario.email}</span>
                <span>{ROL[a.usuario.rol]}</span>
                <span>
                  <Badge tono={a.acreditado ? "exito" : "neutro"}>
                    {a.acreditado ? "Presente" : "Sin registrar"}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={estilos.nota}>
            Todavía no hay inscriptos. Cuando alguien se anote lo vas a ver acá,
            con su asistencia.
          </p>
        )
      ) : null}

      {confirmando && impacto ? (
        <Modal
          etiqueta="Cancelar evento"
          onCerrar={() => (procesando ? undefined : setConfirmando(false))}
        >
          <ModalHeader etiqueta="Cancelar evento" titulo={evento.titulo} />
          <ModalCuerpo>
            <ul className={estilos.impacto}>
              <li>
                {impacto.inscriptos === 0
                  ? "No hay inscriptos: no hay a quién avisar ni reembolsar."
                  : `${numero(impacto.inscriptos)} ${impacto.inscriptos === 1 ? "inscripto va a recibir" : "inscriptos van a recibir"} un aviso de cancelación.`}
              </li>
              {impacto.inscriptosPagos > 0 ? (
                <li>
                  Se devuelven {pesos(impacto.montoAReembolsar)} a{" "}
                  {impacto.inscriptosPagos}{" "}
                  {impacto.inscriptosPagos === 1
                    ? "cuenta institucional"
                    : "cuentas institucionales"}
                  , automáticamente.
                </li>
              ) : null}
              <li>La locación queda libre para otro evento. No se puede deshacer.</li>
            </ul>
            <Campo label="Motivo (se lo informamos a los inscriptos)">
              {(id) => (
                <textarea
                  id={id}
                  className={claseControl}
                  rows={3}
                  maxLength={MAX_LARGO_MOTIVO_CANCELACION}
                  value={motivo}
                  placeholder="Ej. Se suspende por la ausencia del disertante."
                  onChange={(e) => setMotivo(e.target.value)}
                />
              )}
            </Campo>
            <span className={estilos.contador}>
              {motivo.length} / {MAX_LARGO_MOTIVO_CANCELACION}
            </span>
          </ModalCuerpo>
          <ModalPie>
            <Boton disabled={procesando} onClick={() => setConfirmando(false)}>
              Mantener evento
            </Boton>
            <Boton
              variante="destructivo"
              disabled={procesando || !motivo.trim()}
              onClick={() => void confirmarCancelacion()}
            >
              {procesando
                ? "Cancelando y reembolsando…"
                : impacto.montoAReembolsar > 0
                  ? `Cancelar y reembolsar ${pesos(impacto.montoAReembolsar)}`
                  : "Cancelar evento"}
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {resultado ? (
        <Modal
          etiqueta="Resultado de la cancelación"
          onCerrar={() => setResultado(null)}
        >
          <ModalConfirmacion
            titulo={
              resultado.reembolsosPendientes > 0
                ? "Evento cancelado, con reembolsos pendientes"
                : "Evento cancelado"
            }
            texto={[
              resultado.inscriptosAfectados === 0
                ? "No había inscriptos."
                : `Avisamos a ${resultado.notificados} de ${resultado.inscriptosAfectados} inscriptos.`,
              resultado.reembolsados > 0
                ? `Se devolvieron ${pesos(resultado.montoReembolsado)} (${resultado.reembolsados} ${resultado.reembolsados === 1 ? "pago" : "pagos"}).`
                : "",
              resultado.reembolsosPendientes > 0
                ? `${resultado.reembolsosPendientes} ${resultado.reembolsosPendientes === 1 ? "reembolso quedó pendiente" : "reembolsos quedaron pendientes"}: podés reintentarlos desde esta pantalla.`
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <ModalPie centrado>
            <Boton variante="primario" onClick={() => setResultado(null)}>
              Entendido
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}
    </section>
  );
}
