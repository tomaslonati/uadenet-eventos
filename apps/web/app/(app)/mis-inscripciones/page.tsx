"use client";

import { Badge } from "@/components/ui/badge";
import { BotonLink, GrupoBotones } from "@/components/ui/boton";
import { Credencial } from "@/components/ui/credencial";
import { Encabezado, EstadoVacio, Seccion } from "@/components/ui/pantalla";
import { hoyIso, type Evento } from "@/lib/api";
import { codigoCredencial } from "@/lib/dominio";
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

export default function MisInscripciones() {
  const {
    eventos: catalogo,
    inscripciones,
    inscripcionesDetalle,
    cargandoDatos,
  } = useSesion();

  const hoy = hoyIso();
  const mis = inscripciones
    .map((id) => catalogo.find((e) => e.id === id))
    .filter((evento): evento is Evento => Boolean(evento))
    .map((evento) => {
      const detalle = inscripcionesDetalle.find(
        (i) => i.eventoId === evento.id,
      );
      return {
        vista: vistaDe(evento, true),
        inscripcionId: detalle?.id,
        montoCobrado: detalle?.montoCobrado,
      };
    });

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
              </GrupoBotones>
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

      {mis.length === 0 ? (
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
    </>
  );
}
