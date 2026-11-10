import { EditarEvento } from "./editar-evento";

export default async function PaginaEditarEvento(
  props: PageProps<"/eventos/[id]/editar">,
) {
  const { id } = await props.params;
  return <EditarEvento eventoId={id} />;
}
