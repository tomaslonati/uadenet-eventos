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
import { Cupo, Segmentado } from "@/components/ui/controles";
import {
  Modal,
  ModalConfirmacion,
  ModalPie,
} from "@/components/ui/modal";
import { Encabezado } from "@/components/ui/pantalla";
import { choquesDe, estaLibre, primeraFranjaLibre } from "@/lib/dominio";
import { fechaLarga, horario, minutos, pesos } from "@/lib/formato";
import {
  LOCACIONES,
  SEDES,
  TIPOS_EVENTO,
  reservasDe,
  type TipoEvento,
} from "@/lib/mock/eventos";

import estilos from "./nuevo.module.css";

type Modo = "wizard" | "unico";

const MODOS: { valor: Modo; label: string }[] = [
  { valor: "wizard", label: "Paso a paso" },
  { valor: "unico", label: "Formulario único" },
];

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
    desc: "Mail institucional y aviso en el portal.",
  },
  {
    label: "Habilitar lista de espera al completarse el cupo",
    desc: "Se promueve automáticamente cuando alguien cancela.",
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
  precio: string;
  opciones: boolean[];
};

const INICIAL: Formulario = {
  titulo: "",
  tipo: "Workshop",
  disertante: "",
  descripcion: "",
  fecha: "2026-09-12",
  desde: "10:00",
  hasta: "13:00",
  sede: "Sede Centro",
  locacion: "Auditorio Magno",
  cupo: "120",
  arancelado: false,
  precio: "",
  opciones: [true, true, false],
};

function soloNumeros(valor: string): number {
  return Number.parseInt(valor.replace(/\D/g, ""), 10) || 0;
}

export default function NuevoEvento() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("wizard");
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<Formulario>(INICIAL);
  const [publicado, setPublicado] = useState(false);

  const editar = (cambios: Partial<Formulario>) =>
    setForm((actual) => ({ ...actual, ...cambios }));

  const esWizard = modo === "wizard";
  const verPaso = (numero: number) => !esWizard || paso === numero;
  const enUltimoPaso = !esWizard || paso === 3;

  const franja = { desde: form.desde, hasta: form.hasta };
  const reservas = reservasDe(form.locacion, form.fecha);
  const choque = choquesDe(franja, reservas)[0];
  const hayConflicto = choque !== undefined;
  const bloqueado = enUltimoPaso && hayConflicto;

  // Sólo se ofrecen alternativas que realmente resuelven el choque.
  const otrasLocaciones = LOCACIONES.filter(
    (locacion) =>
      locacion !== form.locacion &&
      estaLibre(franja, reservasDe(locacion, form.fecha)),
  ).slice(0, 2);
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

  const precioNumero = soloNumeros(form.precio);
  const cupoNumero = soloNumeros(form.cupo);
  const rango = horario(form.desde, form.hasta);

  const avanzar = () => {
    if (!enUltimoPaso) {
      setPaso((actual) => actual + 1);
      return;
    }
    if (hayConflicto) return;
    setPublicado(true);
  };

  return (
    <>
      <Encabezado
        titulo="Nuevo evento"
        bajada={
          esWizard
            ? "Tres pasos. La disponibilidad de la locación se valida antes de publicar."
            : "Todo en una pantalla. La disponibilidad se valida al publicar."
        }
        accion={
          <Segmentado
            etiqueta="Modo de carga"
            opciones={MODOS}
            activa={modo}
            onCambio={(nuevo) => {
              setModo(nuevo);
              setPaso(1);
            }}
          />
        }
      />

      {esWizard ? (
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
      ) : null}

      <div className={estilos.layout}>
        <div className={estilos.formulario}>
          {verPaso(1) ? (
            <section className={estilos.bloque}>
              <span className={estilos.bloqueTitulo}>Datos del evento</span>
              <Campo label="Título">
                {(id) => (
                  <input
                    id={id}
                    className={claseControl}
                    value={form.titulo}
                    placeholder="Ej. Jornada de Innovación Educativa"
                    onChange={(evento) => editar({ titulo: evento.target.value })}
                  />
                )}
              </Campo>
              <div className={estilos.grillaDatos}>
                <Campo label="Tipo">
                  {(id) => (
                    <select
                      id={id}
                      className={claseControl}
                      value={form.tipo}
                      onChange={(evento) =>
                        editar({ tipo: evento.target.value as TipoEvento })
                      }
                    >
                      {TIPOS_EVENTO.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
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

          {verPaso(2) ? (
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
                      onChange={(evento) => editar({ fecha: evento.target.value })}
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
                      onChange={(evento) => editar({ desde: evento.target.value })}
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
                      onChange={(evento) => editar({ hasta: evento.target.value })}
                    />
                  )}
                </Campo>
              </div>
              <div className={estilos.grillaLugar}>
                <Campo label="Sede">
                  {(id) => (
                    <select
                      id={id}
                      className={claseControl}
                      value={form.sede}
                      onChange={(evento) => editar({ sede: evento.target.value })}
                    >
                      {SEDES.map((sede) => (
                        <option key={sede} value={sede}>
                          {sede}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo label="Locación">
                  {(id) => (
                    <select
                      id={id}
                      className={hayConflicto ? claseControlError : claseControl}
                      value={form.locacion}
                      onChange={(evento) =>
                        editar({ locacion: evento.target.value })
                      }
                    >
                      {LOCACIONES.map((locacion) => (
                        <option key={locacion} value={locacion}>
                          {locacion}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo label="Cupo máximo">
                  {(id) => (
                    <input
                      id={id}
                      inputMode="numeric"
                      className={claseControl}
                      value={form.cupo}
                      onChange={(evento) => editar({ cupo: evento.target.value })}
                    />
                  )}
                </Campo>
              </div>

              <div className={estilos.ocupacion}>
                <div className={estilos.ocupacionHeader}>
                  <span className={estilos.ocupacionTitulo}>
                    Ocupación de {form.locacion}
                  </span>
                  <span className={estilos.ocupacionFecha}>
                    {fechaLarga(form.fecha)}
                  </span>
                </div>
                <div className={estilos.pista}>
                  {reservas.map((reserva) => (
                    <div
                      key={reserva.titulo}
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
                    «{choque.titulo}» ocupa {form.locacion} de {choque.desde} a{" "}
                    {choque.hasta}. No se puede reservar la misma locación para
                    dos eventos concurrentes.
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
                    Locación disponible. Ninguna reserva se superpone con {rango}.
                  </span>
                </div>
              )}
            </section>
          ) : null}

          {verPaso(3) ? (
            <section className={estilos.bloque}>
              <span className={estilos.bloqueTitulo}>Inscripción</span>
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
                    desc: "Se descuenta del saldo institucional.",
                  },
                ].map((opcion) => (
                  <button
                    key={opcion.label}
                    type="button"
                    aria-pressed={form.arancelado === opcion.arancelado}
                    className={`${estilos.modoPago} ${
                      form.arancelado === opcion.arancelado
                        ? estilos.modoPagoElegido
                        : ""
                    }`}
                    onClick={() => editar({ arancelado: opcion.arancelado })}
                  >
                    <span className={estilos.modoPagoLabel}>{opcion.label}</span>
                    <span className={estilos.modoPagoDesc}>{opcion.desc}</span>
                  </button>
                ))}
              </div>

              {form.arancelado ? (
                <div className={estilos.grillaDatos}>
                  <Campo label="Arancel por persona">
                    {(id) => (
                      <input
                        id={id}
                        inputMode="numeric"
                        className={claseControl}
                        value={form.precio}
                        placeholder="0"
                        onChange={(evento) =>
                          editar({ precio: evento.target.value })
                        }
                      />
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
                <span className={estilos.bloqueTitulo}>Asistencia y avisos</span>
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
                      <span className={estilos.opcionLabel}>{opcion.label}</span>
                      <span className={estilos.opcionDesc}>{opcion.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <div className={estilos.acciones}>
            {esWizard && paso > 1 ? (
              <Boton onClick={() => setPaso((actual) => actual - 1)}>Atrás</Boton>
            ) : null}
            <Boton variante="primario" disabled={bloqueado} onClick={avanzar}>
              {enUltimoPaso
                ? hayConflicto
                  ? "Resolvé el conflicto para publicar"
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
                {form.sede} — {form.locacion}
              </span>
            </div>
            <Cupo texto={`0 / ${form.cupo} inscriptos`} porcentaje={0} />
          </div>
        </aside>
      </div>

      {publicado ? (
        <Modal etiqueta="Evento publicado" onCerrar={() => setPublicado(false)}>
          <ModalConfirmacion
            titulo="Evento publicado"
            texto={`El evento quedó reservado en ${form.locacion} el ${fechaLarga(form.fecha)} y ya aparece en la cartelera de ${form.sede}.`}
          />
          <ModalPie centrado>
            <Boton variante="primario" onClick={() => router.push("/gestion")}>
              Volver a la gestión
            </Boton>
          </ModalPie>
        </Modal>
      ) : null}
    </>
  );
}
