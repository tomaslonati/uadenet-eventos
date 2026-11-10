"use client";

import { useEffect, useState } from "react";

import { BotonLink } from "@/components/ui/boton";
import { EstadoVacio } from "@/components/ui/pantalla";
import { fetchEventoPorIdApi, type Evento } from "@/lib/api";
import { puedeGestionar } from "@/lib/dominio";
import { useSesion } from "@/lib/sesion";

import { FormularioEvento } from "../../formulario-evento";

export function EditarEvento({ eventoId }: { eventoId: string }) {
  const { accessToken, usuario, eventos: catalogo, cargandoDatos } = useSesion();
  const [directo, setDirecto] = useState<Evento | null>(null);
  const [buscando, setBuscando] = useState(false);

  const enCatalogo = catalogo.find((e) => e.id === eventoId);
  const evento = enCatalogo ?? directo;

  useEffect(() => {
    if (enCatalogo || cargandoDatos) return;
    let cancelado = false;
    const cargar = async () => {
      setBuscando(true);
      try {
        const remoto = await fetchEventoPorIdApi(eventoId, accessToken);
        if (!cancelado) setDirecto(remoto);
      } catch {
        if (!cancelado) setDirecto(null);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [eventoId, accessToken, enCatalogo, cargandoDatos]);

  const volver = (
    <BotonLink href={`/eventos/${eventoId}`} tamano="sm">
      Volver al evento
    </BotonLink>
  );

  if (!evento) {
    return (
      <EstadoVacio
        texto={
          buscando || cargandoDatos
            ? "Cargando el evento…"
            : "No encontramos el evento que querés editar."
        }
      />
    );
  }
  if (evento.creadoPor !== usuario.id) {
    return (
      <EstadoVacio
        texto="Solo quien creó el evento puede editarlo."
        accion={volver}
      />
    );
  }
  if (evento.estadoPublicacion === "cancelado") {
    return (
      <EstadoVacio
        texto="El evento está cancelado, ya no se puede modificar."
        accion={volver}
      />
    );
  }
  if (!puedeGestionar(evento)) {
    return (
      <EstadoVacio
        texto="El evento ya empezó, ya no se puede modificar."
        accion={volver}
      />
    );
  }

  return <FormularioEvento evento={evento} />;
}
