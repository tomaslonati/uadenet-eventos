import { notFound } from "next/navigation";

import { EVENTO_EN_CURSO, buscarEvento } from "@/lib/mock/eventos";

import { ControlAsistencia } from "./control-asistencia";

export default async function Asistencia(props: PageProps<"/asistencia">) {
  const { evento: eventoId } = await props.searchParams;
  const elegido =
    typeof eventoId === "string" ? eventoId : EVENTO_EN_CURSO;
  const evento = buscarEvento(elegido) ?? buscarEvento(EVENTO_EN_CURSO);
  if (!evento) notFound();

  return <ControlAsistencia evento={evento} />;
}
