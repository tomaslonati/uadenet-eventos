"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Boton, BotonLink } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { Segmentado } from "@/components/ui/controles";
import { Encabezado, EstadoVacio } from "@/components/ui/pantalla";
import { Select } from "@/components/ui/select";
import {
  eliminarAsistenciaApi,
  fetchAsistenciaEventoApi,
  registrarAsistenciaApi,
  type AsistenteEventoApi,
} from "@/lib/api";
import { horario, iniciales } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";

import estilos from "./asistencia.module.css";

type Metodo = "qr" | "manual";

const METODOS: { valor: Metodo; label: string }[] = [
  { valor: "qr", label: "Credencial QR" },
  { valor: "manual", label: "Lista manual" },
];

function formatearHora(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ControlAsistencia({ eventoId }: { eventoId?: string }) {
  const router = useRouter();
  const {
    usuario,
    rol,
    accessToken,
    eventos: catalogo,
    cargandoDatos,
    mostrarToast,
  } = useSesion();

  const [metodo, setMetodo] = useState<Metodo>("qr");
  const [codigoQr, setCodigoQr] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [asistentes, setAsistentes] = useState<AsistenteEventoApi[]>([]);
  const [cargandoPadron, setCargandoPadron] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  // Filtrar exclusivamente los eventos creados por el usuario administrativo actual
  const misEventosCreados = useMemo(
    () => catalogo.filter((e) => e.creadoPor === usuario.id),
    [catalogo, usuario.id],
  );

  // Si vino un eventoId por URL, verificar si existe en el catálogo general
  const eventoSolicitado = eventoId
    ? catalogo.find((e) => e.id === eventoId)
    : undefined;

  // Verificar si el evento solicitado pertenece a otro creador
  const esEventoAjeno =
    eventoSolicitado && eventoSolicitado.creadoPor !== usuario.id;

  // Preseleccionar el primer evento creado por el usuario solo cuando no venga por URL
  const eventoActivo = eventoId
    ? !esEventoAjeno
      ? eventoSolicitado
      : undefined
    : misEventosCreados[0];

  const eventoIdActivo = eventoActivo?.id;

  const recargarAsistentes = useCallback(async () => {
    if (!eventoIdActivo || rol !== "admin") return;
    try {
      const lista = await fetchAsistenciaEventoApi(eventoIdActivo, accessToken);
      setAsistentes(lista);
    } catch {
      // Ignorar errores al recargar
    }
  }, [eventoIdActivo, accessToken, rol]);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!eventoIdActivo || rol !== "admin") {
        setAsistentes([]);
        setBusqueda("");
        setCodigoQr("");
        setCargandoPadron(false);
        return;
      }

      setAsistentes([]);
      setBusqueda("");
      setCodigoQr("");
      setCargandoPadron(true);
      try {
        const lista = await fetchAsistenciaEventoApi(
          eventoIdActivo,
          accessToken,
        );
        if (!cancelado) setAsistentes(lista);
      } catch {
        if (!cancelado) setAsistentes([]);
      } finally {
        if (!cancelado) setCargandoPadron(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [eventoIdActivo, accessToken, rol]);

  // Caso 0: El rol autenticado no es administrativo
  if (!cargandoDatos && rol !== "admin") {
    return (
      <>
        <Encabezado
          antetitulo="Control de asistencia"
          titulo="Acceso restringido"
          bajada="La gestión y toma de presentismo está reservada exclusivamente para el personal administrativo creador del evento."
          accion={
            <BotonLink href="/cartelera" variante="secundario">
              Ir a cartelera
            </BotonLink>
          }
        />
        <EstadoVacio texto="Solo usuarios administrativos creadores de eventos pueden gestionar asistencias." />
      </>
    );
  }

  // Caso 1: Se solicitó un evento por URL pero no existe en el catálogo
  if (eventoId && !cargandoDatos && !eventoSolicitado) {
    return (
      <>
        <Encabezado
          antetitulo="Control de asistencia"
          titulo="Evento no encontrado"
          bajada="El identificador de evento especificado en el enlace no existe o fue dado de baja."
          accion={
            <BotonLink href="/asistencia" variante="secundario">
              Ver mis eventos
            </BotonLink>
          }
        />
        <EstadoVacio texto="No se encontró ningún evento con el ID especificado en la URL." />
      </>
    );
  }

  // Caso 2: Intentó ingresar a un evento creado por otro usuario
  if (esEventoAjeno && eventoSolicitado) {
    return (
      <>
        <Encabezado
          antetitulo="Control de asistencia"
          titulo="Acceso restringido"
          bajada={`El evento "${eventoSolicitado.titulo}" fue creado por otro administrativo (${eventoSolicitado.creadoPor}).`}
          accion={
            <BotonLink href="/gestion" variante="secundario">
              Volver a gestión
            </BotonLink>
          }
        />
        <EstadoVacio texto="Solo el administrativo que creó este evento puede tomar y gestionar la asistencia." />
      </>
    );
  }

  // Caso 3: El usuario no tiene ningún evento creado
  if (!eventoActivo) {
    return (
      <>
        <Encabezado
          antetitulo="Control de asistencia"
          titulo="Mis eventos para asistencia"
          bajada="Solo podés tomar asistencia en los eventos académicos que creaste."
          accion={
            <BotonLink href="/eventos/nuevo" variante="primario">
              + Crear evento
            </BotonLink>
          }
        />
        <EstadoVacio
          texto={
            cargandoDatos
              ? "Cargando tus eventos para control de asistencia…"
              : "No tenés eventos creados actualmente. Solo el creador de un evento puede registrar su presentismo."
          }
        />
      </>
    );
  }

  const pendientes = asistentes.filter((a) => !a.acreditado);
  const ingresos = asistentes
    .filter((a) => a.acreditado)
    .slice()
    .sort((a, b) =>
      (b.asistencia?.confirmadaEn ?? "").localeCompare(
        a.asistencia?.confirmadaEn ?? "",
      ),
    );

  const totalInscriptos = asistentes.length || eventoActivo.inscriptos;
  const tasa = totalInscriptos
    ? Math.round((ingresos.length / totalInscriptos) * 100)
    : 0;

  // Filtrado reactivo en columna izquierda: ESTRICTAMENTE pendientes de acreditar
  const termino = busqueda.trim().toLowerCase();
  const pendientesFiltrados = pendientes.filter((item) => {
    if (!termino) return true;
    return (
      item.usuario.nombre.toLowerCase().includes(termino) ||
      item.usuario.id.toLowerCase().includes(termino) ||
      item.usuario.email.toLowerCase().includes(termino)
    );
  });

  // Si no se encuentra en pendientes pero coincide con alguien que ya ingresó
  const yaAcreditadoEncontrado = termino
    ? ingresos.find(
        (item) =>
          item.usuario.nombre.toLowerCase().includes(termino) ||
          item.usuario.id.toLowerCase().includes(termino) ||
          item.usuario.email.toLowerCase().includes(termino),
      )
    : undefined;

  const acreditarInscripcion = async (
    inscripcionId: string,
    via: Metodo,
    nombre?: string,
  ) => {
    if (registrando || !eventoIdActivo) return;
    setRegistrando(true);
    try {
      await registrarAsistenciaApi(
        inscripcionId,
        via,
        accessToken,
        eventoIdActivo,
      );
      setCodigoQr("");
      await recargarAsistentes();
      mostrarToast(
        nombre ? `Ingreso registrado: ${nombre}` : "Ingreso registrado",
      );
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la asistencia.",
      );
    } finally {
      setRegistrando(false);
    }
  };

  const desmarcarInscripcion = async (
    inscripcionId: string,
    nombre?: string,
  ) => {
    if (registrando || !eventoIdActivo) return;
    setRegistrando(true);
    try {
      await eliminarAsistenciaApi(inscripcionId, accessToken, eventoIdActivo);
      await recargarAsistentes();
      mostrarToast(
        nombre ? `Asistencia removida: ${nombre}` : "Asistencia removida",
      );
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : "No se pudo revertir la asistencia.",
      );
    } finally {
      setRegistrando(false);
    }
  };

  const escanearQr = () => {
    const limpio = codigoQr.trim();
    if (!limpio) return;

    // Validar si el código corresponde a un inscripto de este evento específico
    const encontrado = asistentes.find(
      (a) =>
        a.inscripcionId.toLowerCase() === limpio.toLowerCase() ||
        a.usuario.id.toLowerCase() === limpio.toLowerCase() ||
        a.usuario.email.toLowerCase() === limpio.toLowerCase(),
    );

    if (!encontrado) {
      mostrarToast(
        "La credencial ingresada no corresponde a un inscripto de este evento.",
      );
      return;
    }

    if (encontrado.acreditado) {
      mostrarToast(
        `El inscripto ${encontrado.usuario.nombre} ya fue acreditado anteriormente.`,
      );
      return;
    }

    void acreditarInscripcion(
      encontrado.inscripcionId,
      "qr",
      encontrado.usuario.nombre,
    );
  };

  return (
    <>
      <Encabezado
        antetitulo="Control de asistencia · creador"
        titulo={eventoActivo.titulo}
        bajada={`${eventoActivo.sede} — ${eventoActivo.locacion} · ${horario(eventoActivo.desde, eventoActivo.hasta)}`}
        accion={
          <Segmentado
            etiqueta="Método de acreditación"
            opciones={METODOS}
            activa={metodo}
            onCambio={setMetodo}
          />
        }
      />

      {misEventosCreados.length > 1 ? (
        <div className={estilos.barraSelector}>
          <span className={estilos.selectorLabel}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Alternar evento:
          </span>
          <div className={estilos.selectorWrapper}>
            <Select
              etiqueta="Cambiar evento"
              className={estilos.selectTrigger}
              valor={`${eventoActivo.titulo} — ${eventoActivo.fecha} · ${horario(eventoActivo.desde, eventoActivo.hasta)} (${eventoActivo.locacion})`}
              opciones={misEventosCreados.map(
                (e) =>
                  `${e.titulo} — ${e.fecha} · ${horario(e.desde, e.hasta)} (${e.locacion})`,
              )}
              onCambiar={(opcionElegida) => {
                const ev = misEventosCreados.find(
                  (e) =>
                    `${e.titulo} — ${e.fecha} · ${horario(e.desde, e.hasta)} (${e.locacion})` ===
                    opcionElegida,
                );
                if (ev) {
                  router.push(`/asistencia?evento=${ev.id}`);
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <div className={estilos.kpis}>
        <div className={estilos.kpi}>
          <div className={estilos.kpiTextos}>
            <span className={estilos.kpiClave}>Acreditados</span>
            <span className={estilos.kpiSub}>
              sobre {totalInscriptos} inscriptos
            </span>
          </div>
          <span className={`${estilos.kpiValor} ${estilos.kpiValorExito}`}>
            {ingresos.length}
          </span>
        </div>
        <div className={estilos.kpi}>
          <div className={estilos.kpiTextos}>
            <span className={estilos.kpiClave}>Tasa de asistencia</span>
            <span className={estilos.kpiSub}>
              se cierra al finalizar el evento
            </span>
          </div>
          <span className={estilos.kpiValor}>{tasa}%</span>
        </div>
      </div>

      <div className={estilos.layout}>
        <div className={estilos.metodo}>
          {metodo === "qr" ? (
            <>
              <span className={estilos.metodoTitulo}>Escáner en puerta</span>
              <p className={estilos.metodoTexto}>
                El asistente muestra la credencial desde su portal. Pegá o
                escaneá el código UUID de la credencial o el legajo del
                inscripto.
              </p>
              <div className={estilos.escanerWrapper}>
                <div className={estilos.escaner} aria-hidden>
                  <div className={estilos.escanerMarco} />
                  <div className={estilos.escanerLinea} />
                </div>
              </div>
              <input
                className={claseControl}
                placeholder="Código de credencial o legajo"
                value={codigoQr}
                onChange={(e) => setCodigoQr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && codigoQr.trim() && !registrando) {
                    escanearQr();
                  }
                }}
              />
              <Boton
                variante="primario"
                bloque
                disabled={registrando || !codigoQr.trim()}
                onClick={escanearQr}
              >
                {registrando ? "Validando credencial…" : "Validar credencial"}
              </Boton>
            </>
          ) : null}

          {metodo === "manual" ? (
            <>
              <div className={estilos.manualHeader}>
                <span className={estilos.metodoTitulo}>
                  Inscriptos pendientes de acreditar
                </span>
                <p className={estilos.metodoTexto}>
                  {totalInscriptos === 0
                    ? "Este evento aún no tiene personas inscriptas."
                    : `Alumnos habilitados para ingresar (${pendientes.length} restantes). Buscá por nombre o legajo y confirmá su ingreso.`}
                </p>
              </div>

              <input
                type="search"
                className={claseControl}
                placeholder="Buscar por nombre, legajo o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <div className={estilos.pendientes}>
                {cargandoPadron && asistentes.length === 0 ? (
                  <p className={estilos.metodoTexto}>Cargando padrón…</p>
                ) : yaAcreditadoEncontrado &&
                  pendientesFiltrados.length === 0 ? (
                  <div className={estilos.avisoAcreditado}>
                    <span className={estilos.avisoAcreditadoTitulo}>
                      ✓ {yaAcreditadoEncontrado.usuario.nombre} ya fue
                      acreditado
                    </span>
                    <span className={estilos.avisoAcreditadoSub}>
                      Legajo {yaAcreditadoEncontrado.usuario.id} · figura en la
                      columna de Ingresos registrados a la derecha.
                    </span>
                  </div>
                ) : pendientesFiltrados.length === 0 ? (
                  <p className={estilos.metodoTexto}>
                    {termino
                      ? `No se encontraron inscriptos pendientes para "${busqueda}".`
                      : totalInscriptos === 0 || asistentes.length === 0
                        ? "Este evento todavía no tiene personas inscriptas."
                        : pendientes.length === 0
                          ? "¡Todos los inscriptos ya fueron acreditados!"
                          : "No hay inscriptos pendientes."}
                  </p>
                ) : (
                  pendientesFiltrados.map((item) => (
                    <div
                      key={item.inscripcionId}
                      className={estilos.itemManual}
                    >
                      <div className={estilos.itemManualInfo}>
                        <div className={estilos.itemManualFilaSuperior}>
                          <span className={estilos.pendienteNombre}>
                            {item.usuario.nombre}
                          </span>
                          <Badge tono="neutro">Pendiente</Badge>
                        </div>
                        <span className={estilos.pendienteLegajo}>
                          Legajo: {item.usuario.id} · {item.usuario.email} ·{" "}
                          {item.usuario.rol}
                        </span>
                      </div>

                      <div className={estilos.itemManualAcciones}>
                        <Boton
                          variante="primario"
                          tamano="xs"
                          disabled={registrando}
                          onClick={() =>
                            void acreditarInscripcion(
                              item.inscripcionId,
                              "manual",
                              item.usuario.nombre,
                            )
                          }
                        >
                          Acreditar
                        </Boton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className={estilos.registro}>
          <div className={estilos.registroHeader}>
            <span className={estilos.registroTitulo}>Ingresos registrados</span>
            <span className={estilos.registroCuenta}>
              {ingresos.length} de {totalInscriptos}
            </span>
          </div>

          {ingresos.length === 0 ? (
            <div className={estilos.sinIngresos}>
              <span className={estilos.sinIngresosTitulo}>
                Todavía no ingresó nadie.
              </span>
              <span className={estilos.sinIngresosTexto}>
                Los registros aparecen acá en tiempo real.
              </span>
            </div>
          ) : (
            ingresos.map((ingreso) => (
              <div key={ingreso.inscripcionId} className={estilos.fila}>
                <span className={estilos.iniciales} aria-hidden>
                  {iniciales(ingreso.usuario.nombre)}
                </span>
                <span className={estilos.filaDatos}>
                  <span className={estilos.filaNombre}>
                    {ingreso.usuario.nombre}
                  </span>
                  <span className={estilos.filaLegajo}>
                    Legajo: {ingreso.usuario.id} · {ingreso.usuario.email}
                  </span>
                </span>
                <span className={estilos.filaHora}>
                  {formatearHora(ingreso.asistencia?.confirmadaEn)}
                </span>
                <div className={estilos.accionesFila}>
                  <Badge tono="exito" className={estilos.badgeValidado}>
                    Validado
                  </Badge>
                  <Boton
                    variante="destructivo"
                    tamano="xs"
                    disabled={registrando}
                    onClick={() =>
                      void desmarcarInscripcion(
                        ingreso.inscripcionId,
                        ingreso.usuario.nombre,
                      )
                    }
                  >
                    Quitar
                  </Boton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
