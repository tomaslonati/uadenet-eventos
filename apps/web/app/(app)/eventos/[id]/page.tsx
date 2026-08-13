import { notFound } from "next/navigation";

import { EVENTOS, buscarEvento } from "@/lib/mock/eventos";

import { DetalleEvento } from "./detalle-evento";

export function generateStaticParams() {
  return EVENTOS.map((evento) => ({ id: evento.id }));
}

export default async function PaginaEvento(props: PageProps<"/eventos/[id]">) {
  const { id } = await props.params;
  const evento = buscarEvento(id);
  if (!evento) notFound();

  return <DetalleEvento evento={evento} />;
}
