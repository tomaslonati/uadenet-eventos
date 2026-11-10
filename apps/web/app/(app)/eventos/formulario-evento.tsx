"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/boton";
import {
  Campo,
  claseControl,
  claseControlError,
  claseSoloLectura,
} from "@/components/ui/campo";
import { Cupo } from "@/components/ui/controles";
import {
  Modal,
  ModalConfirmacion,
  ModalCuerpo,
  ModalHeader,
  ModalPie,
} from "@/components/ui/modal";
import { Encabezado } from "@/components/ui/pantalla";
import { Select } from "@/components/ui/select";
import {
  TIPOS_EVENTO,
  actualizarEventoApi,
  codificarDescripcionEvento,
  crearEventoApi,
  fechasIso,
  hoyIso,
  reservasDeEventos,
  type CambiosEvento,
  type CategoriaPrecio,
  type Evento,
  type TipoEvento,
} from "@/lib/api";
import { choquesDe, estaLibre, primeraFranjaLibre } from "@/lib/dominio";
import {
  fechaLarga,
  horario,
  minutos,
  numero,
  pesos,
  sumarDias,
} from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./formulario-evento.module.css";

const PASOS = [
  { numero: 1, label: "Datos" },
  { numero: 2, label: "Locación y cupo" },
  { numero: 3, label: "Inscripción" },
];

/** La jornada — y con ella la pista de ocupación — va de 08:00 a 22:00. */
const JORNADA = { desde: "08:00", hasta: "22:00" };
const HORAS_EJE = ["08", "10", "12", "14", "16", "18", "20", "22"];

function posicion(hora: string): number {
  const inicio = minutos(JORNADA.desde);
  return ((minutos(hora) - inicio) / (minutos(JORNADA.hasta) - inicio)) * 100;
}

const OPCIONES = [
  {
    label: "Acreditación con credencial digital",
    desc: "Cada inscripto recibe un código único que se valida en la puerta.",
  },
  {
    label: "Recordatorio automático 7 días antes",
    desc: "Mail institucional y aviso en el portal vía CORE.",
  },
];

type Formulario = {
  titulo: string;
  tipo: TipoEvento;
  disertante: string;
  descripcion: string;
  fecha: string;
  desde: string;
  hasta: string;
  sede: string;
  locacion: string;
  cupo: string;
  arancelado: boolean;
  categoriaPrecio: CategoriaPrecio | null;
  opciones: boolean[];
};

function soloNumeros(valor: string): number {
  return Number.parseInt(valor.replace(/\D/g, ""), 10) || 0;
}

function formularioDe(evento: Evento): Formulario {
  return {
    titulo: evento.titulo,
    tipo: evento.tipo,
    disertante: evento.disertante,
    descripcion: evento.descripcion,
    fecha: evento.fecha,
    desde: evento.desde,
    hasta: evento.hasta,
    sede: evento.sede,
    locacion: evento.locacion,
    cupo: String(evento.cupo),
    arancelado: evento.categoriaPrecio !== null,
    categoriaPrecio: evento.categoriaPrecio,
    opciones: [true, true],
  };
}

/**
 * Alta de un evento nuevo o, si recibe `evento`, edición del existente. Es el
 * mismo formulario en los dos casos para que el creador no tenga que aprender
 * dos pantallas; lo que cambia es qué se puede tocar cuando ya hay inscriptos.
 */
export function FormularioEvento({ evento }: { evento?: Evento }) {
  const router = useRouter();
  const editando = evento !== undefined;
  const inscriptos = evento?.inscriptos ?? 0;
  const {
    accessToken,
    sedes,
    locaciones,
    tarifas,
    eventos,
    recargarDatos,
    mostrarToast,
  } = useSesion();

  const sedesOpciones =
    sedes.length > 0
      ? sedes
      : Array.from(new Set(locaciones.map((l) => l.sede)));

  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<Formulario>(() =>
    evento ? formularioDe(evento) : ({
    titulo: "",
    tipo: "Workshop",
    disertante: "",
    descripcion: "",
    fecha: sumarDias(hoyIso(), 7),
    desde: "10:00",
    hasta: "13:00",
    sede: sedesOpciones[0] ?? "Sede Centro",
    locacion: locaciones[0]?.nombre ?? "Auditorio Magno",
    cupo: "120",
    arancelado: false,
    categoriaPrecio: null,
    opciones: [true, true],
  }),
  );
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(false);
  const [confirmandoCambios, setConfirmandoCambios] = useState(false);
  const [notificados, setNotificados] = useState(0);

  const sedeEfectiva =
    sedesOpciones.includes(form.sede)
      ? form.sede
      : (sedesOpciones[0] ?? form.sede);

  // Al editar, la locación actual sigue ofrecida aunque Backoffice ya no la marque apta.
  const ofrecible = (l: (typeof locaciones)[number]) =>
    l.aptoEventos || l.id === evento?.locacionId;
  const locacionesDeSede = locaciones.filter(
    (l) => ofrecible(l) && l.sede === sedeEfectiva,
  );
  const catalogoLocaciones =
    locacionesDeSede.length > 0 ? locacionesDeSede : locaciones.filter(ofrecible);
  const nombresLocaciones = catalogoLocaciones.map((l) => l.nombre);

  const locacionSeleccionada =
    catalogoLocaciones.find((l) => l.nombre === form.locacion) ??
    catalogoLocaciones[0];
  const nombreLocacionEfectiva =
    locacionSeleccionada?.nombre ?? form.locacion;

  const editar = (cambios: Partial<Formulario>) =>
    setForm((actual) => ({ ...actual, ...cambios }));

  const enUltimoPaso = paso === PASOS.length;

  const franja = { desde: form.desde, hasta: form.hasta };
  // Al editar, el propio evento no cuenta como ocupación de la locación.
  const otrosEventos = eventos.filter((e) => e.id !== evento?.id);
  const reservas = reservasDeEventos(
    otrosEventos,
    nombreLocacionEfectiva,
    form.fecha,
  );
  const choque = choquesDe(franja, reservas)[0];
  const hayConflicto = choque !== undefined;

  const otrasLocaciones = nombresLocaciones
    .filter(
      (loc) =>
        loc !== nombreLocacionEfectiva &&
        estaLibre(franja, reservasDeEventos(otrosEventos, loc, form.fecha)),
    )
    .slice(0, 2);
  const otroHorario = primeraFranjaLibre(
    minutos(form.hasta) - minutos(form.desde),
    reservas,
    JORNADA,
  );
  const alternativas = [
    ...otrasLocaciones.map((locacion) => ({
      label: `Mover a ${locacion}`,
      aplicar: () => editar({ locacion }),
    })),
    ...(otroHorario
      ? [
          {
            label: `Correr a ${horario(otroHorario.desde, otroHorario.hasta)}`,
            aplicar: () => editar(otroHorario),
          },
        ]
      : []),
  ];

  const precioNumero = form.categoriaPrecio
    ? tarifas[form.categoriaPrecio]
    : 0;
  const cupoNumero = soloNumeros(form.cupo);
  const rango = horario(form.desde, form.hasta);
  const cupoPorDebajo = editando && cupoNumero < inscriptos;
  const pagoBloqueado = editando && inscriptos > 0;

  const cambios: CambiosEvento = {};
  if (evento) {
    const original = formularioDe(evento);
    if (form.titulo.trim() !== original.titulo) {
      cambios.titulo = form.titulo.trim();
    }
    if (
      form.tipo !== original.tipo ||
      form.disertante.trim() !== original.disertante ||
      form.descripcion.trim() !== original.descripcion
    ) {
      cambios.descripcion = codificarDescripcionEvento(
        form.tipo,
        form.disertante,
        form.descripcion,
      );
    }
    if (cupoNumero !== evento.cupo) cambios.cupoMaximo = cupoNumero;
    if (
      locacionSeleccionada &&
      locacionSeleccionada.id !== evento.locacionId
    ) {
      cambios.locacionId = locacionSeleccionada.id;
    }
    if (
      form.fecha !== evento.fecha ||
      form.desde !== evento.desde ||
      form.hasta !== evento.hasta
    ) {
      Object.assign(cambios, fechasIso(form.fecha, form.desde, form.hasta));
    }
    if (form.arancelado !== (evento.categoriaPrecio !== null)) {
      cambios.esPago = form.arancelado;
      cambios.categoriaPrecio = form.arancelado ? form.categoriaPrecio : null;
    } else if (form.categoriaPrecio !== evento.categoriaPrecio) {
      cambios.categoriaPrecio = form.categoriaPrecio;
    }
  }
  const hayCambios = Object.keys(cambios).length > 0;
  const cambiaFechaOLugar =
    cambios.fechaInicio !== undefined || cambios.locacionId !== undefined;
  const avisaAInscriptos = cambiaFechaOLugar && inscriptos > 0;

  const bloqueado =
    enUltimoPaso &&
    (hayConflicto || publicando || cupoPorDebajo || (editando && !hayCambios));

  const avanzar = async () => {
    if (paso === 1 && !form.titulo.trim()) {
      mostrarToast("Ingresá un título para el evento.");
      return;
    }
    if (!enUltimoPaso) {
      setPaso((actual) => actual + 1);
      return;
    }
    if (hayConflicto || publicando) return;
    if (!locacionSeleccionada) {
      mostrarToast("No hay una locación sincronizada disponible en esta sede.");
      return;
    }
    if (cupoNumero <= 0) {
      mostrarToast("El cupo máximo debe ser mayor a 0.");
      return;
    }
    if (cupoPorDebajo) {
      mostrarToast(`Ya hay ${inscriptos} inscriptos; el cupo no puede ser menor.`);
      return;
    }

    if (editando) {
      if (avisaAInscriptos) {
        setConfirmandoCambios(true);
        return;
      }
      await guardarCambios();
      return;
    }

    setPublicando(true);
    try {
      await crearEventoApi(
        {
          titulo: form.titulo,
          tipo: form.tipo,
          disertante: form.disertante,
          descripcion: form.descripcion,
          locacionId: locacionSeleccionada.id,
          cupoMaximo: cupoNumero,
          fecha: form.fecha,
          desde: form.desde,
          hasta: form.hasta,
          esPago: form.arancelado,
          categoriaPrecio: form.arancelado ? form.categoriaPrecio : null,
        },
        accessToken,
      );
      await recargarDatos();
      setPublicado(true);
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo publicar el evento.",
      );
    } finally {
      setPublicando(false);
    }
  };

  const guardarCambios = async () => {
    if (!evento) return;
    setConfirmandoCambios(false);
    setPublicando(true);
    try {
      const resultado = await actualizarEventoApi(
        evento.id,
        cambios,
        accessToken,
      );
      setNotificados(resultado.notificados);
      await recargarDatos();
      setPublicado(true);
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : "No se pudieron guardar los cambios.",
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <>
      <Encabezado
        titulo={editando ? "Editar evento" : "Nuevo evento"}
        bajada={
          editando
            ? inscriptos > 0
              ? `Ya hay ${inscriptos} inscriptos: si cambiás la fecha o el lugar, se les avisa.`
              : "Todavía no hay inscriptos, podés cambiar lo que necesites."
            : "Tres pasos. La disponibilidad de la locación se valida antes de publicar."
        }
      />

      <ol className={estilos.pasos}>
        {PASOS.map((item) => {
          const activo = paso === item.numero;
          const hecho = paso > item.numero;
          return (
            <li
              key={item.numero}
              aria-current={activo ? "step" : undefined}
              className={[
                estilos.paso,
                activo ? estilos.pasoActivo : "",
                hecho ? estilos.pasoHecho : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={[
                  estilos.pasoNumero,
                  activo ? estilos.pasoNumeroActivo : "",
                  hecho ? estilos.pasoNumeroHecho : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hecho ? "✓" : item.numero}
              </span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>

      <div className={estilos.layout}>
        <div className={estilos.formulario}>
          {paso === 1 ? (
            <section className={estilos.bloque}>
              <span className={estilos.bloqueTitulo}>Datos del evento</span>
              <Campo label="Título">
                {(id) => (
                  <input
                    id={id}
                    className={claseControl}
                    value={form.titulo}
                    placeholder="Ej. Jornada de Innovación Educativa"
                    onChange={(evento) =>
                      editar({ titulo: evento.target.value })
                    }
                  />
                )}
              </Campo>
              <div className={estilos.grillaDatos}>
                <Campo label="Tipo">
                  {(id) => (
                    <Select
                      id={id}
                      etiqueta="Tipo"
                      className={claseControl}
                      valor={form.tipo}
                      opciones={TIPOS_EVENTO}
                      onCambiar={(valor) =>
                        editar({ tipo: valor as TipoEvento })
                      }
                    />
                  )}
                </Campo>
                <Campo label="Disertante">
                  {(id) => (
                    <input
                      id={id}
                      className={claseControl}
                      value={form.disertante}
                      onChange={(evento) =>
                        editar({ disertante: evento.target.value })
                      }
                    />
                  )}
                </Campo>
              </div>
              <Campo label="Descripción">
                {(id) => (
                  <textarea
                    id={id}
                    className={claseControl}
                    rows={3}
                    value={form.descripcion}
                    onChange={(evento) =>
                      editar({ descripcion: evento.target.value })
                    }
                  />
                )}
              </Campo>
            </section>
          ) : null}

          {paso === 2 ? (
            <section className={estilos.bloque}>
              <span className={estilos.bloqueTitulo}>
                Fecha, locación y cupo
              </span>
              <div className={estilos.grillaHorario}>
                <Campo label="Fecha">
                  {(id) => (
                    <input
                      id={id}
                      type="date"
                      className={claseControl}
                      value={form.fecha}
                      onChange={(evento) =>
                        editar({ fecha: evento.target.value })
                      }
                    />
                  )}
                </Campo>
                <Campo label="Desde">
                  {(id) => (
                    <input
                      id={id}
                      type="time"
                      className={claseControl}
                      value={form.desde}
                      onChange={(evento) =>
                        editar({ desde: evento.target.value })
                      }
                    />
                  )}
                </Campo>
                <Campo label="Hasta">
                  {(id) => (
                    <input
                      id={id}
                      type="time"
                      className={claseControl}
                      value={form.hasta}
                      onChange={(evento) =>
                        editar({ hasta: evento.target.value })
                      }
                    />
                  )}
                </Campo>
              </div>
              <div className={estilos.grillaLugar}>
                <Campo label="Sede">
                  {(id) => (
                    <Select
                      id={id}
                      etiqueta="Sede"
                      className={claseControl}
                      valor={sedeEfectiva}
                      opciones={
                        sedesOpciones.length > 0
                          ? sedesOpciones
                          : [sedeEfectiva]
                      }
                      onCambiar={(valor) => {
                        const primeraLoc = locaciones.find(
                          (l) => l.aptoEventos && l.sede === valor,
                        );
                        editar({
                          sede: valor,
                          ...(primeraLoc ? { locacion: primeraLoc.nombre } : {}),
                        });
                      }}
                    />
                  )}
                </Campo>
                <Campo label="Locación">
                  {(id) => (
                    <Select
                      id={id}
                      etiqueta="Locación"
                      className={hayConflicto ? claseControlError : claseControl}
                      valor={nombreLocacionEfectiva}
                      opciones={
                        nombresLocaciones.length > 0
                          ? nombresLocaciones
                          : [nombreLocacionEfectiva]
                      }
                      onCambiar={(valor) => editar({ locacion: valor })}
                    />
                  )}
                </Campo>
                <Campo label="Cupo máximo">
                  {(id) => (
                    <input
                      id={id}
                      inputMode="numeric"
                      className={claseControl}
                      value={form.cupo}
                      onChange={(evento) =>
                        editar({ cupo: evento.target.value })
                      }
                    />
                  )}
                </Campo>
              </div>

              {cupoPorDebajo ? (
                <p className={estilos.avisoCampo} role="alert">
                  Ya hay {inscriptos} inscriptos: el cupo no puede ser menor.
                </p>
              ) : null}

              <div className={estilos.ocupacion}>
                <div className={estilos.ocupacionHeader}>
                  <span className={estilos.ocupacionTitulo}>
                    Ocupación de {nombreLocacionEfectiva}
                  </span>
                  <span className={estilos.ocupacionFecha}>
                    {fechaLarga(form.fecha)}
                  </span>
                </div>
                <div className={estilos.pista}>
                  {reservas.map((reserva) => (
                    <div
                      key={`${reserva.titulo}-${reserva.desde}`}
                      className={estilos.reserva}
                      style={{
                        left: `${posicion(reserva.desde)}%`,
                        width: `${posicion(reserva.hasta) - posicion(reserva.desde)}%`,
                      }}
                    >
                      {reserva.titulo}
                    </div>
                  ))}
                  <div
                    className={`${estilos.nuevo} ${
                      hayConflicto ? estilos.nuevoEnConflicto : ""
                    }`}
                    style={{
                      left: `${posicion(form.desde)}%`,
                      width: `${Math.max(posicion(form.hasta) - posicion(form.desde), 4)}%`,
                    }}
                  >
                    Nuevo
                  </div>
                </div>
                <div className={estilos.eje}>
                  {HORAS_EJE.map((hora) => (
                    <span key={hora}>{hora}</span>
                  ))}
                </div>
              </div>

              {choque ? (
                <div className={estilos.conflicto}>
                  <div className={estilos.conflictoHeader}>
                    <span className={estilos.punto} />
                    <span className={estilos.conflictoTitulo}>
                      Locación ocupada en ese horario
                    </span>
                  </div>
                  <p className={estilos.conflictoTexto}>
                    «{choque.titulo}» ocupa {nombreLocacionEfectiva} de{" "}
                    {choque.desde} a {choque.hasta}. No se puede reservar la
                    misma locación para dos eventos concurrentes.
                  </p>
                  {alternativas.length > 0 ? (
                    <div>
                      <span className={estilos.alternativasTitulo}>
                        Alternativas sin conflicto
                      </span>
                      <div className={estilos.alternativas}>
                        {alternativas.map((alternativa) => (
                          <button
                            key={alternativa.label}
                            type="button"
                            className={estilos.alternativa}
                            onClick={alternativa.aplicar}
                          >
                            {alternativa.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={estilos.disponible}>
                  <span className={estilos.puntoOk} />
                  <span className={estilos.disponibleTexto}>
                    Locación disponible. Ninguna reserva se superpone con{" "}
                    {rango}.
                  </span>
                </div>
              )}
            </section>
          ) : null}

          {paso === 3 ? (
            <section className={estilos.bloque}>
              <span className={estilos.bloqueTitulo}>Inscripción</span>
              {pagoBloqueado ? (
                <p className={estilos.avisoCampo}>
                  Ya hay {inscriptos} inscriptos, así que no se puede cambiar si
                  el evento es pago ni su categoría de precio. Si hace falta,
                  cancelá el evento (se reembolsa a todos) y publicá uno nuevo.
                </p>
              ) : null}
              <div className={estilos.modosPago}>
                {[
                  {
                    arancelado: false,
                    label: "Gratuito",
                    desc: "Abierto a la comunidad, sin cargo.",
                  },
                  {
                    arancelado: true,
                    label: "Arancelado",
                    desc: "Se descuenta del saldo institucional en CORE.",
                  },
                ].map((opcion) => (
                  <button
                    key={opcion.label}
                    type="button"
                    disabled={pagoBloqueado}
                    aria-pressed={form.arancelado === opcion.arancelado}
                    className={`${estilos.modoPago} ${
                      form.arancelado === opcion.arancelado
                        ? estilos.modoPagoElegido
                        : ""
                    }`}
                    onClick={() =>
                      editar({
                        arancelado: opcion.arancelado,
                        categoriaPrecio: opcion.arancelado ? "general" : null,
                      })
                    }
                  >
                    <span className={estilos.modoPagoLabel}>
                      {opcion.label}
                    </span>
                    <span className={estilos.modoPagoDesc}>{opcion.desc}</span>
                  </button>
                ))}
              </div>

              {form.arancelado ? (
                <div className={estilos.grillaDatos}>
                  <Campo label="Categoría de precio">
                    {() => (
                      <div className={estilos.modosPago}>
                        {(
                          Object.entries(tarifas) as [CategoriaPrecio, number][]
                        ).map(([categoria, tarifa]) => (
                          <button
                            key={categoria}
                            type="button"
                            disabled={pagoBloqueado}
                            aria-pressed={form.categoriaPrecio === categoria}
                            className={`${estilos.modoPago} ${
                              form.categoriaPrecio === categoria
                                ? estilos.modoPagoElegido
                                : ""
                            }`}
                            onClick={() =>
                              editar({ categoriaPrecio: categoria })
                            }
                          >
                            <span className={estilos.modoPagoLabel}>
                              {categoria === "general" ? "General" : "Especial"}
                            </span>
                            <span className={estilos.modoPagoDesc}>
                              {pesos(tarifa)} — definido por Backoffice
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </Campo>
                  <Campo label="Recaudación estimada al 100% del cupo">
                    {(id) => (
                      <output id={id} className={claseSoloLectura}>
                        {pesos(precioNumero * cupoNumero)}
                      </output>
                    )}
                  </Campo>
                </div>
              ) : null}

              <div className={estilos.opciones}>
                <span className={estilos.bloqueTitulo}>
                  Asistencia y avisos
                </span>
                {OPCIONES.map((opcion, indice) => (
                  <label key={opcion.label} className={estilos.opcion}>
                    <input
                      type="checkbox"
                      className={estilos.opcionCasilla}
                      checked={form.opciones[indice]}
                      onChange={() =>
                        editar({
                          opciones: form.opciones.map((valor, i) =>
                            i === indice ? !valor : valor,
                          ),
                        })
                      }
                    />
                    <span className={estilos.opcionTextos}>
                      <span className={estilos.opcionLabel}>
                        {opcion.label}
                      </span>
                      <span className={estilos.opcionDesc}>{opcion.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <div className={estilos.acciones}>
            {paso > 1 ? (
              <Boton onClick={() => setPaso((actual) => actual - 1)}>
                Atrás
              </Boton>
            ) : null}
            <Boton
              variante="primario"
              disabled={bloqueado}
              onClick={() => void avanzar()}
            >
              {enUltimoPaso
                ? hayConflicto
                  ? "Resolvé el conflicto para publicar"
                  : editando
                    ? publicando
                      ? "Guardando…"
                      : hayCambios
                        ? "Guardar cambios"
                        : "Sin cambios para guardar"
                    : publicando
                      ? "Publicando…"
                      : "Publicar evento"
                : "Continuar"}
            </Boton>
          </div>
        </div>

        <aside className={estilos.preview}>
          <div className={estilos.previewHeader}>Vista previa en cartelera</div>
          <div className={estilos.previewCuerpo}>
            <div className={estilos.previewFila}>
              <Badge>{form.tipo}</Badge>
              <div className={estilos.previewEspacio} />
              <span
                className={`${estilos.previewPrecio} ${
                  form.arancelado ? "" : estilos.previewGratuito
                }`}
              >
                {form.arancelado ? pesos(precioNumero) : "Gratuito"}
              </span>
            </div>
            <span className={estilos.previewTitulo}>
              {form.titulo || "Título del evento"}
            </span>
            <div className={estilos.previewDatos}>
              <span>
                {fechaLarga(form.fecha)} · {rango}
              </span>
              <span>
                {sedeEfectiva} — {nombreLocacionEfectiva}
              </span>
            </div>
            <Cupo
              texto={`${inscriptos} / ${form.cupo} inscriptos`}
              porcentaje={
                cupoNumero > 0
                  ? Math.min(100, Math.round((inscriptos / cupoNumero) * 100))
                  : 0
              }
            />
          </div>
        </aside>
      </div>

      {confirmandoCambios && evento ? (
        <Modal
          etiqueta="Confirmar cambios"
          onCerrar={() => setConfirmandoCambios(false)}
        >
          <ModalHeader etiqueta="Confirmar cambios" titulo={evento.titulo} />
          <ModalCuerpo>
            <p className={estilos.textoModal}>
              Vas a avisar a {inscriptos}{" "}
              {inscriptos === 1 ? "inscripto" : "inscriptos"} de este cambio:
            </p>
            <ul className={estilos.cambios}>
              {cambios.fechaInicio !== undefined ? (
                <li>
                  <span className={estilos.cambioClave}>Fecha y horario</span>
                  <span>
                    {fechaLarga(evento.fecha)} · {horario(evento.desde, evento.hasta)}
                    {" → "}
                    {fechaLarga(form.fecha)} · {rango}
                  </span>
                </li>
              ) : null}
              {cambios.locacionId !== undefined ? (
                <li>
                  <span className={estilos.cambioClave}>Lugar</span>
                  <span>
                    {evento.sede} — {evento.locacion}
                    {" → "}
                    {sedeEfectiva} — {nombreLocacionEfectiva}
                  </span>
                </li>
              ) : null}
            </ul>
            <p className={estilos.textoModal}>
              Como ellos no eligieron este cambio, van a poder cancelar su
              inscripción sin el límite de 24 horas
              {evento.categoriaPrecio ? " y recuperar lo que pagaron" : ""}.
            </p>
          </ModalCuerpo>
          <ModalPie>
            <Boton onClick={() => setConfirmandoCambios(false)}>Volver</Boton>
            <Boton variante="primario" onClick={() => void guardarCambios()}>
              Guardar y avisar a {inscriptos}
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}

      {publicado ? (
        <Modal
          etiqueta={editando ? "Cambios guardados" : "Evento publicado"}
          onCerrar={() => setPublicado(false)}
        >
          <ModalConfirmacion
            titulo={editando ? "Cambios guardados" : "Evento publicado"}
            texto={
              editando
                ? notificados > 0
                  ? `Guardamos los cambios y avisamos a ${numero(notificados)} ${notificados === 1 ? "inscripto" : "inscriptos"}.`
                  : "Guardamos los cambios del evento."
                : `El evento quedó reservado en ${nombreLocacionEfectiva} el ${fechaLarga(form.fecha)} y ya aparece en la cartelera de ${sedeEfectiva}.`
            }
          />
          <ModalPie centrado>
            {editando && evento ? (
              <Boton
                variante="primario"
                onClick={() => router.push(`/eventos/${evento.id}`)}
              >
                Ver el evento
              </Boton>
            ) : (
              <Boton variante="primario" onClick={() => router.push("/gestion")}>
                Volver a la gestión
              </Boton>
            )}
          </ModalPie>
        </Modal>
      ) : null}
    </>
  );
}
