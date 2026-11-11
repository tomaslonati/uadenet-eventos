"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/boton";
import { Cupo } from "@/components/ui/controles";
import {
  Modal,
  ModalConfirmacion,
  ModalCuerpo,
  ModalHeader,
  ModalPie,
} from "@/components/ui/modal";
import { EstadoVacio } from "@/components/ui/pantalla";
import { fetchEventoPorIdApi, type Evento } from "@/lib/api";
import { conflictoDe, haFinalizado } from "@/lib/dominio";
import { anio, horario, iniciales, pesos } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import { PanelOrganizador } from "./panel-organizador";

import estilos from "./detalle.module.css";

type Dialogo = "checkout" | "conflicto" | "confirmado" | null;

export function DetalleEvento({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const {
    rol,
    usuario,
    accessToken,
    saldo,
    inscripcionesDetalle,
    eventos: catalogo,
    estaInscripto,
    inscribir,
    mostrarToast,
  } = useSesion();
  const [eventoDirecto, setEventoDirecto] = useState<Evento | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const enCatalogo = catalogo.find((e) => e.id === eventoId);
  const evento = enCatalogo ?? eventoDirecto;

  useEffect(() => {
    if (enCatalogo) return;
    let cancelado = false;

    const cargar = async () => {
      setBuscando(true);
      try {
        const remoto = await fetchEventoPorIdApi(eventoId, accessToken);
        if (!cancelado) setEventoDirecto(remoto);
      } catch {
        if (!cancelado) setEventoDirecto(null);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [eventoId, accessToken, enCatalogo]);

  if (!evento) {
    return (
      <EstadoVacio
        texto={
          buscando
            ? "Cargando detalle del evento…"
            : "No encontramos el evento solicitado."
        }
      />
    );
  }

  const vista = vistaDe(evento, estaInscripto(evento.id));
  const cancelado = evento.estadoPublicacion === "cancelado";
  const finalizado = haFinalizado(evento);
  const esCreador = evento.creadoPor === usuario.id;
  const inscripcionCancelada = inscripcionesDetalle.find(
    (i) => i.eventoId === evento.id && i.estado === "cancelada",
  );
  const eventosInscriptos = catalogo.filter((e) => estaInscripto(e.id));
  const conflicto = conflictoDe(evento, eventosInscriptos);
  const saldoPosterior = saldo - evento.precio;

  const meta = [
    { clave: "Fecha", valor: `${vista.fechaLarga} de ${anio(evento.fecha)}` },
    { clave: "Horario", valor: `${vista.rangoHorario} h` },
    { clave: "Sede", valor: evento.sede },
    { clave: "Locación", valor: evento.locacion },
    { clave: "Cupo máximo", valor: `${evento.cupo} personas` },
    {
      clave: "Modalidad",
      valor: "Presencial · acreditación con credencial digital",
    },
  ];

  const ctaLabel = cancelado
    ? "Evento cancelado"
    : finalizado
    ? "Evento finalizado"
    : procesando
    ? "Confirmando…"
    : vista.inscripto
      ? "Ya estás inscripto"
      : vista.lleno
        ? "Cupo completo"
        : evento.precio
          ? `Inscribirme por ${pesos(evento.precio)}`
          : "Inscribirme";

  const ctaHint = cancelado
    ? "Ya no se pueden hacer inscripciones."
    : finalizado
    ? "El evento ya concluyó."
    : vista.inscripto
    ? "Ya tenés tu lugar confirmado."
    : vista.lleno
      ? "No quedan lugares disponibles."
      : evento.precio
        ? "Se descuenta de tu cuenta institucional en CORE al confirmar."
        : "Sin costo. Se te asigna una credencial digital al confirmar.";

  const ejecutarInscripcion = async () => {
    setProcesando(true);
    try {
      await inscribir(evento);
      setDialogo("confirmado");
    } catch (err) {
      setDialogo(null);
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo completar la inscripción.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const intentarInscribir = () => {
    if (cancelado || finalizado || vista.inscripto || vista.lleno || procesando) return;
    if (conflicto) {
      setDialogo("conflicto");
      return;
    }
    if (evento.precio) {
      setDialogo("checkout");
      return;
    }
    void ejecutarInscripcion();
  };

  const confirmarPago = () => {
    if (saldoPosterior < 0) {
      setDialogo(null);
      router.push("/cuenta");
      return;
    }
    void ejecutarInscripcion();
  };

  return (
    <>
      <Link
        href={rol === "admin" ? "/gestion" : "/cartelera"}
        className={estilos.volver}
      >
        ← Volver
      </Link>

      {cancelado ? (
        <div className={`${estilos.banner} ${estilos.bannerCancelado}`} role="status">
          <strong>Este evento fue cancelado.</strong>
          <span>
            Motivo: {evento.motivoCancelacion ?? "sin motivo informado"}.
          </span>
          {inscripcionCancelada ? (
            <span>
              {inscripcionCancelada.pagoConfirmado &&
              inscripcionCancelada.montoCobrado
                ? inscripcionCancelada.reembolsadoEn
                  ? `Tu inscripción se dio de baja y te devolvimos ${pesos(inscripcionCancelada.montoCobrado)} a tu cuenta institucional.`
                  : `Tu inscripción se dio de baja. Estamos procesando la devolución de ${pesos(inscripcionCancelada.montoCobrado)}; vas a verla en tu cuenta institucional.`
                : "Tu inscripción se dio de baja."}
            </span>
          ) : null}
        </div>
      ) : evento.reprogramado ? (
        <div className={`${estilos.banner} ${estilos.bannerReprogramado}`} role="status">
          <strong>Este evento se reprogramó.</strong>
          <span>
            Revisá la nueva fecha y el lugar.
            {vista.inscripto
              ? " Si ya no podés asistir, podés cancelar tu inscripción hasta que empiece el evento"
              : ""}
            {vista.inscripto && evento.precio ? " y se te devuelve el saldo." : vista.inscripto ? "." : ""}
          </span>
        </div>
      ) : null}

      <div className={estilos.layout}>
        <article className={estilos.ficha}>
          <div
            className={`${estilos.franja} ${vista.inscripto ? estilos.franjaPropia : ""}`}
          />
          <div className={estilos.fichaCuerpo}>
            <div className={estilos.etiquetas}>
              <Badge>{evento.tipo}</Badge>
              <Badge tono={vista.estado.tono}>{vista.estado.texto}</Badge>
            </div>
            <h1 className={estilos.titulo}>{evento.titulo}</h1>
            <p className={estilos.descripcion}>{evento.descripcion}</p>
            <dl className={estilos.meta}>
              {meta.map((item) => (
                <div key={item.clave} className={estilos.metaItem}>
                  <dt className={estilos.metaClave}>{item.clave}</dt>
                  <dd className={estilos.metaValor}>{item.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <aside className={estilos.lateral}>
          <div className={estilos.panel}>
            <div className={estilos.precioFila}>
              <span className={estilos.precioLabel}>Inscripción</span>
              <span
                className={`${estilos.precio} ${vista.gratuito ? estilos.precioGratuito : ""}`}
              >
                {vista.precioLabel}
              </span>
            </div>
            <Cupo texto={vista.cupoLabel} porcentaje={vista.porcentaje} alta />
            <Boton
              variante={
                cancelado || finalizado || vista.inscripto
                  ? "secundario"
                  : vista.lleno
                    ? "secundario"
                    : "primario"
              }
              bloque
              disabled={cancelado || finalizado || vista.inscripto || vista.lleno || procesando}
              onClick={intentarInscribir}
            >
              {ctaLabel}
            </Boton>
            <p className={estilos.ctaHint}>{ctaHint}</p>
          </div>

          <div className={estilos.organiza}>
            <span className={estilos.organizaLabel}>Organiza</span>
            <div className={estilos.organizaPersona}>
              <span className={estilos.avatar} aria-hidden>
                {iniciales(evento.disertante)}
              </span>
              <span className={estilos.organizaDatos}>
                <span className={estilos.organizaNombre}>
                  {evento.disertante}
                </span>
                <span className={estilos.organizaArea}>{evento.area}</span>
              </span>
            </div>
          </div>
        </aside>
      </div>

      {esCreador ? <PanelOrganizador evento={evento} /> : null}

      {dialogo === "checkout" ? (
        <Modal
          etiqueta="Confirmar inscripción"
          onCerrar={() => setDialogo(null)}
        >
          <ModalHeader etiqueta="Confirmar inscripción" titulo={evento.titulo} />
          <ModalCuerpo>
            <div className={estilos.lineaCheckout}>
              <span>Arancel de inscripción</span>
              <span>{pesos(evento.precio)}</span>
            </div>
            <div className={estilos.lineaCheckout}>
              <span>Saldo actual</span>
              <span>{pesos(saldo)}</span>
            </div>
            <div
              className={`${estilos.lineaCheckout} ${estilos.lineaSecundaria}`}
            >
              <span>Sede y locación</span>
              <span>
                {evento.sede} · {evento.locacion}
              </span>
            </div>
            <div className={estilos.saldoPost}>
              <span>Saldo después de la operación</span>
              <span
                className={`${estilos.saldoPostValor} ${
                  saldoPosterior < 0 ? estilos.saldoNegativo : ""
                }`}
              >
                {pesos(Math.max(saldoPosterior, 0))}
              </span>
            </div>
            {saldoPosterior < 0 ? (
              <p className={estilos.alerta}>
                Saldo insuficiente. Cargá tu cuenta institucional antes de
                confirmar.
              </p>
            ) : null}
          </ModalCuerpo>
          <ModalPie>
            <Boton onClick={() => setDialogo(null)}>Cancelar</Boton>
            <Boton
              variante={saldoPosterior < 0 ? "destructivo" : "primario"}
              disabled={procesando}
              onClick={confirmarPago}
            >
              {saldoPosterior < 0
                ? "Ver mi cuenta"
                : procesando
                  ? "Procesando pago en CORE…"
                  : "Confirmar y pagar"}
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {dialogo === "conflicto" && conflicto ? (
        <Modal
          etiqueta="Conflicto de horario"
          onCerrar={() => setDialogo(null)}
        >
          <div className={estilos.conflictoHeader}>
            <span className={estilos.puntoError} />
            <span className={estilos.conflictoTitulo}>
              Ya tenés un evento en ese horario
            </span>
          </div>
          <ModalCuerpo>
            <p className={estilos.conflictoTexto}>
              Ya estás inscripto a «{conflicto.titulo}», que se dicta el mismo
              día de {conflicto.desde} a {conflicto.hasta}. El sistema no
              permite dos inscripciones concurrentes.
            </p>
            <div className={estilos.conflictoCards}>
              <div
                className={`${estilos.conflictoCard} ${estilos.conflictoCardActual}`}
              >
                <span className={estilos.conflictoRol}>Ya inscripto</span>
                <span className={estilos.conflictoEvento}>
                  {conflicto.titulo}
                </span>
                <span className={estilos.conflictoHorario}>
                  {horario(conflicto.desde, conflicto.hasta)}
                </span>
              </div>
              <div className={estilos.conflictoCard}>
                <span className={estilos.conflictoRol}>Querés sumarte</span>
                <span className={estilos.conflictoEvento}>{evento.titulo}</span>
                <span className={estilos.conflictoHorario}>
                  {vista.rangoHorario}
                </span>
              </div>
            </div>
          </ModalCuerpo>
          <ModalPie>
            <Boton onClick={() => setDialogo(null)}>Entendido</Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {dialogo === "confirmado" ? (
        <Modal
          etiqueta="Inscripción confirmada"
          onCerrar={() => setDialogo(null)}
        >
          <ModalConfirmacion
            titulo={evento.precio ? "Pago confirmado" : "Inscripción confirmada"}
            texto={
              evento.precio
                ? `Se descontaron ${pesos(evento.precio)} de tu cuenta institucional en CORE. Ya tenés tu credencial digital para «${evento.titulo}».`
                : `Ya tenés tu credencial digital para «${evento.titulo}». Te recordamos por mail una semana antes.`
            }
          />
          <ModalPie centrado>
            <Boton onClick={() => setDialogo(null)}>Seguir mirando</Boton>
            <Boton
              variante="primario"
              onClick={() => router.push("/mis-inscripciones")}
            >
              Ver mi credencial
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}
    </>
  );
}
