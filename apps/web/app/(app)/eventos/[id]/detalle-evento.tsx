"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { conflictoDe } from "@/lib/dominio";
import { horario, iniciales, pesos } from "@/lib/formato";
import type { Evento } from "@/lib/mock/eventos";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./detalle.module.css";

type Dialogo = "checkout" | "conflicto" | "confirmado" | null;

export function DetalleEvento({ evento }: { evento: Evento }) {
  const router = useRouter();
  const {
    rol,
    saldo,
    inscripciones,
    estaInscripto,
    inscribir,
    reemplazar,
    mostrarToast,
  } = useSesion();
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const vista = vistaDe(evento, estaInscripto(evento.id));
  const conflicto = conflictoDe(evento, inscripciones);
  const saldoPosterior = saldo - evento.precio;

  const meta = [
    { clave: "Fecha", valor: `${vista.fechaLarga} de 2026` },
    { clave: "Horario", valor: `${vista.rangoHorario} h` },
    { clave: "Sede", valor: evento.sede },
    { clave: "Locación", valor: evento.locacion },
    { clave: "Cupo máximo", valor: `${evento.cupo} personas` },
    {
      clave: "Modalidad",
      valor: "Presencial · acreditación con credencial digital",
    },
  ];

  const ctaLabel = vista.inscripto
    ? "Ya estás inscripto"
    : vista.lleno
      ? "Anotarme en lista de espera"
      : evento.precio
        ? `Inscribirme por ${pesos(evento.precio)}`
        : "Inscribirme";

  const ctaHint = vista.inscripto
    ? "Podés cancelar desde Mis inscripciones hasta 24 h antes."
    : vista.lleno
      ? "Te avisamos si se libera un lugar. Hay 12 personas antes que vos."
      : evento.precio
        ? "Se descuenta de tu cuenta institucional al confirmar."
        : "Sin costo. Se te asigna una credencial digital al confirmar.";

  const intentarInscribir = () => {
    if (vista.inscripto) return;
    if (vista.lleno) {
      mostrarToast("Te sumamos a la lista de espera. Sos el número 13.");
      return;
    }
    if (conflicto) {
      setDialogo("conflicto");
      return;
    }
    if (evento.precio) {
      setDialogo("checkout");
      return;
    }
    inscribir(evento, false);
    setDialogo("confirmado");
  };

  const confirmarPago = () => {
    if (saldoPosterior < 0) {
      setDialogo(null);
      router.push("/cuenta");
      return;
    }
    inscribir(evento, true);
    setDialogo("confirmado");
  };

  return (
    <>
      <Link href={rol === "admin" ? "/gestion" : "/cartelera"} className={estilos.volver}>
        ← Volver
      </Link>

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
                vista.inscripto ? "secundario" : vista.lleno ? "secundario" : "primario"
              }
              bloque
              disabled={vista.inscripto}
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

      {dialogo === "checkout" ? (
        <Modal etiqueta="Confirmar inscripción" onCerrar={() => setDialogo(null)}>
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
            <div className={`${estilos.lineaCheckout} ${estilos.lineaSecundaria}`}>
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
              onClick={confirmarPago}
            >
              {saldoPosterior < 0 ? "Cargar saldo" : "Confirmar y pagar"}
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {dialogo === "conflicto" && conflicto ? (
        <Modal etiqueta="Conflicto de horario" onCerrar={() => setDialogo(null)}>
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
            <Boton
              variante="primario"
              onClick={() => {
                reemplazar(conflicto.id, evento);
                setDialogo("confirmado");
              }}
            >
              Cambiar por este evento
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {dialogo === "confirmado" ? (
        <Modal etiqueta="Inscripción confirmada" onCerrar={() => setDialogo(null)}>
          <ModalConfirmacion
            titulo={evento.precio ? "Pago confirmado" : "Inscripción confirmada"}
            texto={
              evento.precio
                ? `Se descontaron ${pesos(evento.precio)} de tu cuenta institucional. Ya tenés tu credencial digital para «${evento.titulo}».`
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
