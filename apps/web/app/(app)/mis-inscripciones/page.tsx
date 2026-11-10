"use client";

import { HORAS_ANTICIPACION_CANCELACION } from "@repo/contracts";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton, BotonLink, GrupoBotones } from "@/components/ui/boton";
import { Credencial } from "@/components/ui/credencial";
import {
  Modal,
  ModalCuerpo,
  ModalHeader,
  ModalPie,
} from "@/components/ui/modal";
import { Encabezado, EstadoVacio, Seccion } from "@/components/ui/pantalla";
import { hoyIso, type Evento } from "@/lib/api";
import { codigoCredencial, puedeCancelarInscripcion } from "@/lib/dominio";
import {
  anio,
  diasEntre,
  fechaLarga,
  pesos,
  sumarDias,
} from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./mis-inscripciones.module.css";

const RECORDATORIO_DIAS = 7;

type Cancelacion = {
  inscripcionId: string;
  titulo: string;
  /** Monto que se devuelve; 0 si la inscripción fue gratuita. */
  monto: number;
};

export default function MisInscripciones() {
  const {
    eventos: catalogo,
    inscripciones,
    inscripcionesDetalle,
    cargandoDatos,
    cancelarInscripcion,
    mostrarToast,
  } = useSesion();
  const [cancelacion, setCancelacion] = useState<Cancelacion | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const hoy = hoyIso();
  const mis = inscripciones
    .map((id) => catalogo.find((e) => e.id === id))
    .filter((evento): evento is Evento => Boolean(evento))
    .sort((a, b) => {
      const fechaA = `${a.fecha}T${a.desde || "00:00"}`;
      const fechaB = `${b.fecha}T${b.desde || "00:00"}`;
      return fechaA.localeCompare(fechaB) || a.titulo.localeCompare(b.titulo);
    })
    .map((evento) => {
      const detalle = inscripcionesDetalle.find(
        (i) => i.eventoId === evento.id,
      );
      return {
        vista: vistaDe(evento, true),
        inscripcionId: detalle?.id,
        montoCobrado: detalle?.montoCobrado,
        cancelable: puedeCancelarInscripcion(evento),
      };
    });

  const pedirCancelacion = (item: (typeof mis)[number]) => {
    if (!item.inscripcionId) return;
    setCancelacion({
      inscripcionId: item.inscripcionId,
      titulo: item.vista.titulo,
      monto: item.montoCobrado ?? 0,
    });
  };

  const confirmarCancelacion = async () => {
    if (!cancelacion || cancelando) return;
    setCancelando(true);
    try {
      const reembolsado = await cancelarInscripcion(cancelacion.inscripcionId);
      mostrarToast(
        reembolsado
          ? `Inscripción cancelada. Se devolvieron ${pesos(reembolsado)} a tu cuenta institucional.`
          : "Inscripción cancelada.",
      );
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : "No se pudo cancelar la inscripción.",
      );
    } finally {
      setCancelando(false);
      setCancelacion(null);
    }
  };

  // Bajas que dejó el creador al cancelar el evento: se conservan para seguir el reembolso.
  const canceladas = inscripcionesDetalle
    .filter((i) => i.estado === "cancelada")
    .map((detalle) => ({
      detalle,
      evento: catalogo.find((e) => e.id === detalle.eventoId),
    }))
    .filter(
      (item): item is { detalle: typeof item.detalle; evento: Evento } =>
        Boolean(item.evento),
    );

  const [proximoItem, ...otros] = mis;
  const proximo = proximoItem?.vista;
  const codigoProximo =
    proximoItem?.inscripcionId ??
    (proximo ? codigoCredencial(proximo.id, 0) : "");

  return (
    <>
      <Encabezado
        titulo="Mis inscripciones"
        bajada={
          mis.length === 1
            ? "1 inscripción activa · tu credencial se valida en la puerta"
            : `${mis.length} inscripciones activas · tu credencial se valida en la puerta`
        }
        accion={
          <BotonLink href="/cartelera" tamano="sm">
            Buscar más eventos
          </BotonLink>
        }
      />

      {proximo ? (
        <Seccion titulo="Tu próximo evento">
          <div className={estilos.proximo}>
            <div className={estilos.fecha}>
              <div>
                <div className={estilos.fechaDia}>{proximo.dia}</div>
                <div className={estilos.fechaMes}>{proximo.mes}</div>
                <div className={estilos.fechaAnio}>{anio(proximo.fecha)}</div>
              </div>
              <div>
                <span className={estilos.cuentaRegresiva}>
                  {diasEntre(hoy, proximo.fecha) >= 0
                    ? `en ${diasEntre(hoy, proximo.fecha)} días`
                    : "finalizado"}
                </span>
                <p className={estilos.aviso}>
                  Te avisamos el{" "}
                  {fechaLarga(sumarDias(proximo.fecha, -RECORDATORIO_DIAS))}
                </p>
              </div>
            </div>

            <div className={estilos.proximoCuerpo}>
              <div className={estilos.proximoEtiquetas}>
                <Badge>{proximo.tipo}</Badge>
                <Badge tono={proximo.estado.tono}>{proximo.estado.texto}</Badge>
              </div>
              <h2 className={estilos.proximoTitulo}>{proximo.titulo}</h2>
              <div className={estilos.datos}>
                {[
                  { clave: "Horario", valor: `${proximo.rangoHorario} h` },
                  {
                    clave: "Lugar",
                    valor: `${proximo.sede} — ${proximo.locacion}`,
                  },
                  { clave: "Disertante", valor: proximo.disertante },
                  {
                    clave: "Inscripción",
                    valor:
                      (proximoItem?.montoCobrado ?? proximo.precio)
                        ? `${pesos(proximoItem?.montoCobrado ?? proximo.precio)} · pagado`
                        : "Gratuita",
                  },
                ].map((dato) => (
                  <div key={dato.clave} className={estilos.dato}>
                    <span className={estilos.datoClave}>{dato.clave}</span>
                    <span className={estilos.datoValor}>{dato.valor}</span>
                  </div>
                ))}
              </div>
              <GrupoBotones>
                <BotonLink href={`/eventos/${proximo.id}`} tamano="sm">
                  Ver el evento
                </BotonLink>
                <Boton
                  tamano="sm"
                  disabled={!proximoItem?.cancelable || !proximoItem?.inscripcionId}
                  onClick={() => proximoItem && pedirCancelacion(proximoItem)}
                >
                  {proximoItem?.montoCobrado
                    ? "Cancelar y reembolsar"
                    : "Cancelar inscripción"}
                </Boton>
              </GrupoBotones>
              {!proximoItem?.cancelable ? (
                <p className={estilos.aviso}>
                  {proximo.reprogramado
                    ? "La cancelación cerró porque el evento ya empezó."
                    : `La cancelación cerró: se puede hasta ${HORAS_ANTICIPACION_CANCELACION} horas antes del inicio.`}
                </p>
              ) : null}
            </div>

            <div className={estilos.credencial}>
              <span className={estilos.credencialLabel}>Credencial</span>
              <Credencial semilla={1} codigo={codigoProximo} />
              <span className={estilos.credencialCodigo}>{codigoProximo}</span>
              <span className={estilos.credencialNota}>
                Se marca usada al primer escaneo
              </span>
            </div>
          </div>
        </Seccion>
      ) : null}

      {otros.length > 0 ? (
        <Seccion titulo="También estás anotado">
          <div className={estilos.otros}>
            {otros.map((item, indice) => {
              const evento = item.vista;
              const codigo =
                item.inscripcionId ?? codigoCredencial(evento.id, indice + 1);
              return (
                <div key={evento.id} className={estilos.otro}>
                  <div className={estilos.calendario}>
                    <span className={estilos.calendarioDia}>{evento.dia}</span>
                    <span className={estilos.calendarioMes}>
                      {evento.mesCorto}
                    </span>
                  </div>
                  <div className={estilos.otroDatos}>
                    <span className={estilos.otroTitulo}>{evento.titulo}</span>
                    <span className={estilos.otroSub}>
                      {evento.rangoHorario} · {evento.sede} — {evento.locacion}{" "}
                      · {codigo}
                    </span>
                  </div>
                  <Boton
                    tamano="xs"
                    disabled={!item.cancelable || !item.inscripcionId}
                    title={
                      item.cancelable
                        ? undefined
                        : `Solo se puede cancelar hasta ${HORAS_ANTICIPACION_CANCELACION} horas antes`
                    }
                    onClick={() => pedirCancelacion(item)}
                  >
                    {item.montoCobrado ? "Cancelar y reembolsar" : "Cancelar"}
                  </Boton>
                  <Credencial
                    semilla={indice + 2}
                    codigo={codigo}
                    tamano="chica"
                  />
                </div>
              );
            })}
          </div>
        </Seccion>
      ) : null}

      {canceladas.length > 0 ? (
        <Seccion titulo="Canceladas por el organizador">
          <div className={estilos.historial}>
            {canceladas.map(({ detalle, evento }) => {
              const monto = detalle.pagoConfirmado ? detalle.montoCobrado : null;
              return (
                <div key={detalle.id} className={estilos.filaCanceladaOrg}>
                  <span className={estilos.historialFecha}>
                    {fechaLarga(evento.fecha)}
                  </span>
                  <div className={estilos.canceladaDatos}>
                    <span className={estilos.historialTitulo}>{evento.titulo}</span>
                    <span className={estilos.otroSub}>
                      Motivo: {evento.motivoCancelacion ?? "sin motivo informado"}
                    </span>
                  </div>
                  <span className={estilos.celdaBadge}>
                    {monto === null ? (
                      <Badge tono="error">Cancelado</Badge>
                    ) : detalle.reembolsadoEn ? (
                      <Badge tono="exito">{pesos(monto)} devueltos</Badge>
                    ) : (
                      <Badge tono="atencion">
                        Reembolso de {pesos(monto)} en proceso
                      </Badge>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </Seccion>
      ) : null}

      {mis.length === 0 && canceladas.length === 0 ? (
        <EstadoVacio
          texto={
            cargandoDatos
              ? "Cargando tus inscripciones…"
              : "Todavía no te inscribiste a ningún evento."
          }
          accion={
            <BotonLink href="/cartelera" variante="primario" tamano="sm">
              Ver cartelera
            </BotonLink>
          }
        />
      ) : null}

      {cancelacion ? (
        <Modal
          etiqueta="Cancelar inscripción"
          onCerrar={() => (cancelando ? undefined : setCancelacion(null))}
        >
          <ModalHeader
            etiqueta="Cancelar inscripción"
            titulo={cancelacion.titulo}
          />
          <ModalCuerpo>
            <p className={estilos.textoModal}>
              {cancelacion.monto
                ? `Vas a perder tu lugar y se te devuelven ${pesos(cancelacion.monto)} a tu cuenta institucional.`
                : "Vas a perder tu lugar. La inscripción es gratuita, no hay saldo para devolver."}
            </p>
            <p className={estilos.textoModal}>
              Después de cancelar podés volver a inscribirte si todavía hay
              cupo.
            </p>
          </ModalCuerpo>
          <ModalPie>
            <Boton disabled={cancelando} onClick={() => setCancelacion(null)}>
              Mantener inscripción
            </Boton>
            <Boton
              variante="destructivo"
              disabled={cancelando}
              onClick={() => void confirmarCancelacion()}
            >
              {cancelando
                ? "Cancelando…"
                : cancelacion.monto
                  ? "Cancelar y reembolsar"
                  : "Cancelar inscripción"}
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}
    </>
  );
}
