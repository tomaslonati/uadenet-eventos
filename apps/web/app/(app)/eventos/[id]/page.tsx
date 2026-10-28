import { DetalleEvento } from "./detalle-evento";

export default async function PaginaEvento(props: PageProps<"/eventos/[id]">) {
  const { id } = await props.params;
  return <DetalleEvento eventoId={id} />;
}
