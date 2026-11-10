"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import { fetchNotificacionesApi, type NotificacionApi } from "@/lib/api";
import { useSesion } from "@/lib/sesion";

import estilos from "./avisos.module.css";

const ETIQUETA_TIPO: Record<string, { texto: string; tono: "error" | "atencion" | "neutro" }> = {
  EVENT_CANCELLED: { texto: "Cancelado", tono: "error" },
  EVENT_RESCHEDULED: { texto: "Reprogramado", tono: "atencion" },
  EVENT_REMINDER: { texto: "Recordatorio", tono: "neutro" },
};

function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

export default function Avisos() {
  const { accessToken, cargandoDatos } = useSesion();
  const [avisos, setAvisos] = useState<NotificacionApi[] | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelado = false;
    void fetchNotificacionesApi(accessToken).then((items) => {
      if (!cancelado) setAvisos(items);
    });
    return () => {
      cancelado = true;
    };
  }, [accessToken]);

  return (
    <>
      <Encabezado
        titulo="Avisos"
        bajada="Recordatorios y cambios de los eventos a los que te inscribiste. Te llegan desde CORE."
      />

      {avisos === null ? (
        <EstadoVacio
          texto={
            cargandoDatos || accessToken
              ? "Cargando tus avisos…"
              : "Ingresá para ver tus avisos."
          }
        />
      ) : avisos.length === 0 ? (
        <EstadoVacio texto="No tenés avisos todavía. Cuando un evento se reprograme o se cancele, te enteras acá." />
      ) : (
        <ul className={estilos.lista}>
          {avisos.map((aviso) => {
            const etiqueta = ETIQUETA_TIPO[aviso.type];
            return (
              <li
                key={aviso.id}
                className={`${estilos.aviso} ${aviso.readAt ? "" : estilos.sinLeer}`}
              >
                <div className={estilos.cabecera}>
                  {etiqueta ? (
                    <Badge tono={etiqueta.tono}>{etiqueta.texto}</Badge>
                  ) : null}
                  <span className={estilos.fecha}>{fechaHora(aviso.createdAt)}</span>
                </div>
                <span className={estilos.titulo}>{aviso.title}</span>
                <p className={estilos.mensaje}>{aviso.message}</p>
                {aviso.actionUrl ? (
                  <a className={estilos.enlace} href={aviso.actionUrl}>
                    Ver el evento
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
