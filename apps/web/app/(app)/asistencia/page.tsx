import { ControlAsistencia } from "./control-asistencia";

export default async function Asistencia(props: PageProps<"/asistencia">) {
  const { evento: eventoId } = await props.searchParams;
  const elegido = typeof eventoId === "string" ? eventoId : undefined;
  return <ControlAsistencia eventoId={elegido} />;
}
