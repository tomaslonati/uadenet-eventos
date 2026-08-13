"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton, BotonLink, GrupoBotones } from "@/components/ui/boton";
import { ChipsFiltro, Segmentado } from "@/components/ui/controles";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import { nombrePila } from "@/lib/formato";
import {
  AVISOS,
  FILTROS_AVISO,
  GRUPOS_AVISO,
  PREVIEW_RECORDATORIO,
  REGLA_RECORDATORIO,
} from "@/lib/mock/avisos";
import { useSesion } from "@/lib/sesion";

import estilos from "./avisos.module.css";

type FiltroAviso = (typeof FILTROS_AVISO)[number];
type Canal = "mail" | "portal";

const CANALES: { valor: Canal; label: string }[] = [
  { valor: "mail", label: "Mail institucional" },
  { valor: "portal", label: "Aviso en portal" },
];

export default function Avisos() {
  const {
    usuario,
    avisosLeidos,
    avisosDescartados,
    sinLeer,
    marcarAvisosLeidos,
    descartarAviso,
    mostrarToast,
  } = useSesion();
  const [filtro, setFiltro] = useState<FiltroAviso>("Todos");
  const [canal, setCanal] = useState<Canal>("mail");

  const visibles = AVISOS.filter(
    (aviso) =>
      !avisosDescartados.includes(aviso.id) &&
      (filtro === "Todos" || aviso.tipo === filtro),
  );

  const grupos = GRUPOS_AVISO.map((grupo) => ({
    grupo,
    items: visibles.filter((aviso) => aviso.grupo === grupo),
  })).filter(({ items }) => items.length > 0);

  return (
    <>
      <Encabezado
        titulo="Avisos"
        bajada={
          sinLeer > 0
            ? `${sinLeer} sin leer · el recordatorio sale solo, siete días antes de cada evento`
            : "Todo leído · el recordatorio sale solo, siete días antes de cada evento"
        }
        accion={
          <Boton
            tamano="sm"
            onClick={() => {
              marcarAvisosLeidos();
              mostrarToast("Marcamos todos los avisos como leídos.");
            }}
          >
            Marcar todo como leído
          </Boton>
        }
      />

      <div className={estilos.layout}>
        <div className={estilos.feed}>
          <ChipsFiltro
            opciones={FILTROS_AVISO}
            activa={filtro}
            onCambio={setFiltro}
          />

          {grupos.length === 0 ? (
            <EstadoVacio texto="No quedan avisos con este filtro." />
          ) : null}

          {grupos.map(({ grupo, items }) => (
            <div key={grupo} className={estilos.grupo}>
              <div className={estilos.grupoHeader}>
                <span className={estilos.grupoLabel}>{grupo}</span>
                <span className={estilos.regla} />
              </div>
              {items.map((aviso) => {
                const nuevo = aviso.sinLeer && !avisosLeidos;
                return (
                  <article
                    key={aviso.id}
                    className={`${estilos.aviso} ${nuevo ? estilos.avisoSinLeer : ""}`}
                  >
                    <div
                      className={`${estilos.riel} ${nuevo ? estilos.rielSinLeer : ""}`}
                    />
                    <div className={estilos.avisoCuerpo}>
                      <div className={estilos.avisoMeta}>
                        <Badge tono={nuevo ? "acento" : "neutro"}>
                          {aviso.tipo}
                        </Badge>
                        <span className={estilos.cuando}>{aviso.cuando}</span>
                        <div className={estilos.espacio} />
                        <span className={estilos.canal}>{aviso.canal}</span>
                      </div>
                      <h2 className={estilos.avisoTitulo}>{aviso.titulo}</h2>
                      <p className={estilos.avisoTexto}>{aviso.texto}</p>
                      <div className={estilos.avisoAcciones}>
                        <GrupoBotones>
                          {aviso.accion ? (
                            <BotonLink
                              href={aviso.accion.href}
                              variante="primario"
                              tamano="sm"
                            >
                              {aviso.accion.label}
                            </BotonLink>
                          ) : null}
                          <Boton
                            tamano="sm"
                            onClick={() => descartarAviso(aviso.id)}
                          >
                            Descartar
                          </Boton>
                        </GrupoBotones>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>

        <aside className={estilos.lateral}>
          <div className={estilos.panel}>
            <div>
              <div className={estilos.panelTitulo}>Regla automática</div>
              <p className={estilos.panelBajada}>
                Se dispara sola para cada inscripto, en las tres sedes.
              </p>
            </div>
            <div className={estilos.timeline}>
              {REGLA_RECORDATORIO.map((hito, indice) => (
                <div key={hito.momento} className={estilos.hito}>
                  <div className={estilos.hitoRiel}>
                    <span
                      className={`${estilos.hitoPunto} ${
                        hito.cumplido ? estilos.hitoPuntoCumplido : ""
                      }`}
                    />
                    {indice < REGLA_RECORDATORIO.length - 1 ? (
                      <span className={estilos.hitoLinea} />
                    ) : null}
                  </div>
                  <div className={estilos.hitoTextos}>
                    <span
                      className={`${estilos.hitoMomento} ${
                        hito.cumplido ? estilos.hitoMomentoCumplido : ""
                      }`}
                    >
                      {hito.momento}
                    </span>
                    <span className={estilos.hitoDetalle}>{hito.detalle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={estilos.canales}>
            <Segmentado
              etiqueta="Canal del aviso"
              opciones={CANALES}
              activa={canal}
              onCambio={setCanal}
              expandido
            />

            {canal === "mail" ? (
              <div className={estilos.mail}>
                <div className={estilos.mailHeader}>
                  <span className={estilos.mailRemitente}>
                    {PREVIEW_RECORDATORIO.remitente}
                  </span>
                  <span className={estilos.mailAsunto}>
                    Falta una semana: {PREVIEW_RECORDATORIO.evento}
                  </span>
                </div>
                <div className={estilos.mailCuerpo}>
                  <span className={estilos.mailWordmark}>UADEnet</span>
                  <span className={estilos.mailSaludo}>
                    Hola {nombrePila(usuario.nombre)}, falta una semana.
                  </span>
                  <div className={estilos.mailDatos}>
                    {PREVIEW_RECORDATORIO.datos.map((dato) => (
                      <div key={dato.clave} className={estilos.mailDato}>
                        <span className={estilos.mailDatoClave}>
                          {dato.clave}
                        </span>
                        <span className={estilos.mailDatoValor}>
                          {dato.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className={estilos.mailTexto}>
                    Si no vas a poder asistir, liberá tu lugar: hay{" "}
                    {PREVIEW_RECORDATORIO.enEspera} personas en lista de espera.
                  </p>
                  <div className={estilos.mailBotones}>
                    <span className={estilos.mailBotonPrimario}>
                      Ver mi credencial
                    </span>
                    <span className={estilos.mailBotonSecundario}>
                      No voy a asistir
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={estilos.portal}>
                <span className={estilos.portalLabel}>Aviso en el portal</span>
                <div className={estilos.portalTarjeta}>
                  <span className={estilos.portalPunto} />
                  <div className={estilos.portalDatos}>
                    <span className={estilos.portalTitulo}>
                      Falta una semana: {PREVIEW_RECORDATORIO.evento}
                    </span>
                    <span className={estilos.portalDetalle}>
                      12 de septiembre, 09:00 · Sede Centro — Auditorio Magno
                    </span>
                    <span className={estilos.portalLink}>
                      Ver mi credencial →
                    </span>
                  </div>
                </div>
                <span className={estilos.portalNota}>
                  Aparece en la campana y en Mis inscripciones hasta que el
                  usuario lo lee o pasa el evento.
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
