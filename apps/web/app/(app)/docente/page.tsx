"use client";

import { Badge } from "@/components/ui/badge";
import { BotonLink, GrupoBotones } from "@/components/ui/boton";
import { BarraCupo } from "@/components/ui/controles";
import { Encabezado } from "@/components/ui/pantalla";
import { asistenciaHistorica } from "@/lib/dominio";
import { EVENTOS } from "@/lib/mock/eventos";
import { useSesion } from "@/lib/sesion";
import { vistaDe } from "@/lib/vista-evento";

import estilos from "./docente.module.css";

/** Eventos que dicta el docente de prueba. Los va a resolver la API por disertante. */
const MIS_EVENTOS = ["e2", "e1"];

export default function Docente() {
  const { estaInscripto } = useSesion();

  const eventos = MIS_EVENTOS.map((id) => EVENTOS.find((e) => e.id === id))
    .filter((evento) => evento !== undefined)
    .map((evento) => vistaDe(evento, estaInscripto(evento.id)));

  return (
    <>
      <Encabezado
        titulo="Mis eventos como disertante"
        bajada="Ves la inscripción en vivo y el detalle de asistencia de los eventos que dictás. La programación la hace el área administrativa."
      />

      <div className={estilos.lista}>
        {eventos.map((evento) => (
          <article key={evento.id} className={estilos.tarjeta}>
            <div className={estilos.datos}>
              <div className={estilos.etiquetas}>
                <Badge>{evento.tipo}</Badge>
                <Badge tono={evento.estado.tono}>{evento.estado.texto}</Badge>
              </div>
              <h2 className={estilos.titulo}>{evento.titulo}</h2>
              <span className={estilos.detalle}>
                {evento.fechaLarga} · {evento.rangoHorario} · {evento.sede} —{" "}
                {evento.locacion}
              </span>
              <div className={estilos.acciones}>
                <GrupoBotones>
                  <BotonLink
                    href={`/asistencia?evento=${evento.id}`}
                    tamano="sm"
                  >
                    Control de asistencia
                  </BotonLink>
                  <BotonLink href={`/eventos/${evento.id}`} tamano="sm">
                    Ver ficha pública
                  </BotonLink>
                </GrupoBotones>
              </div>
            </div>

            <div className={estilos.metricas}>
              <div className={estilos.metrica}>
                <span className={estilos.metricaClave}>Inscriptos</span>
                <span className={estilos.metricaValor}>{evento.cupoLabel}</span>
              </div>
              <BarraCupo porcentaje={evento.porcentaje} alta />
              <div className={estilos.metrica}>
                <span className={estilos.metricaClave}>
                  Asistencia histórica
                </span>
                <span className={estilos.metricaAsistencia}>
                  {asistenciaHistorica(evento)}%
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
