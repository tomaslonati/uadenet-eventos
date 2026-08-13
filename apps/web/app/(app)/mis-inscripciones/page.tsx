"use client";

import { Badge } from "@/components/ui/badge";
import { Boton, BotonLink, GrupoBotones } from "@/components/ui/boton";
import { Credencial } from "@/components/ui/credencial";
import { Encabezado, EstadoVacio, Seccion } from "@/components/ui/pantalla";
import { codigoCredencial } from "@/lib/dominio";
import {
  anio,
  diasEntre,
  fechaLarga,
  pesos,
  sumarDias,
} from "@/lib/formato";
import { HISTORIAL_ASISTENCIA } from "@/lib/mock/movimientos";
import { HOY, buscarEvento, type Evento } from "@/lib/mock/eventos";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./mis-inscripciones.module.css";

const RECORDATORIO_DIAS = 7;

export default function MisInscripciones() {
  const { inscripciones, liberar, mostrarToast } = useSesion();

  const mis = inscripciones
    .map(buscarEvento)
    .filter((evento): evento is Evento => Boolean(evento))
    .map((evento) => vistaDe(evento, true));

  const [proximo, ...otros] = mis;

  const cancelar = (eventoId: string) => {
    liberar(eventoId);
    mostrarToast("Inscripción cancelada. Se liberó un lugar.");
  };

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
                  en {diasEntre(HOY, proximo.fecha)} días
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
                    valor: proximo.precio
                      ? `${pesos(proximo.precio)} · pagado`
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
                  variante="destructivo"
                  tamano="sm"
                  onClick={() => cancelar(proximo.id)}
                >
                  Liberar mi lugar
                </Boton>
              </GrupoBotones>
            </div>

            <div className={estilos.credencial}>
              <span className={estilos.credencialLabel}>Credencial</span>
              <Credencial
                semilla={1}
                codigo={codigoCredencial(proximo.id, 0)}
              />
              <span className={estilos.credencialCodigo}>
                {codigoCredencial(proximo.id, 0)}
              </span>
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
            {otros.map((evento, indice) => (
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
                    {evento.rangoHorario} · {evento.sede} — {evento.locacion} ·{" "}
                    {codigoCredencial(evento.id, indice + 1)}
                  </span>
                </div>
                <Boton
                  variante="destructivo"
                  tamano="sm"
                  onClick={() => cancelar(evento.id)}
                >
                  Liberar lugar
                </Boton>
                <Credencial
                  semilla={indice + 2}
                  codigo={codigoCredencial(evento.id, indice + 1)}
                  tamano="chica"
                />
              </div>
            ))}
          </div>
        </Seccion>
      ) : null}

      {mis.length === 0 ? (
        <EstadoVacio
          texto="Todavía no te inscribiste a ningún evento."
          accion={
            <BotonLink href="/cartelera" variante="primario" tamano="sm">
              Ver cartelera
            </BotonLink>
          }
        />
      ) : null}

      <Seccion titulo="Historial de asistencia">
        <div className={estilos.historial}>
          {HISTORIAL_ASISTENCIA.map((registro) => (
            <div key={registro.titulo} className={estilos.filaHistorial}>
              <span className={estilos.historialFecha}>{registro.fecha}</span>
              <span className={estilos.historialTitulo}>{registro.titulo}</span>
              <span className={estilos.celdaBadge}>
                <Badge tono={registro.asistio ? "exito" : "atencion"}>
                  {registro.asistio ? "Asistió" : "No asistió"}
                </Badge>
              </span>
              <span
                className={
                  registro.asistio ? estilos.certificado : estilos.sinCertificado
                }
              >
                {registro.certificado}
              </span>
            </div>
          ))}
        </div>
      </Seccion>
    </>
  );
}
