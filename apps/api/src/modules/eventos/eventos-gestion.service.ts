import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asistencias,
  db,
  eq,
  eventos,
  gt,
  inArray,
  inscripciones,
  locaciones,
  lt,
  ne,
  sql,
} from '@repo/db';
import type {
  ActualizarEvento,
  Evento,
  ImpactoEvento,
  ResultadoCancelacionEvento,
  ResultadoEdicionEvento,
} from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';
import { TarifasService } from '../../common/backoffice/tarifas.service';
import { NotificacionesService } from '../../common/core/notificaciones.service';
import { SaldoService } from '../../common/core/saldo.service';

/** Cuántos reembolsos / avisos se disparan en paralelo: acota la carga sobre CORE y el tiempo de la request. */
const LOTE = 5;

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

function cuando(fecha: Date): string {
  const dia = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA_HORARIA,
  }).format(fecha);
  const hora = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA_HORARIA,
  }).format(fecha);
  return `${dia}, ${hora} h`;
}

function pesos(monto: number): string {
  return `$${monto.toLocaleString('es-AR')}`;
}

async function enLotes<T>(
  items: T[],
  tarea: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += LOTE) {
    await Promise.all(items.slice(i, i + LOTE).map(tarea));
  }
}

/**
 * Ciclo de vida de un evento ya publicado: editarlo y cancelarlo. Solo lo hace
 * su creador, igual que la asistencia (HU6). Vive aparte de `EventosService`
 * porque depende de CORE (reembolsos y avisos), que la cartelera no necesita.
 */
@Injectable()
export class EventosGestionService {
  private readonly logger = new Logger(EventosGestionService.name);

  constructor(
    private readonly tarifasService: TarifasService,
    private readonly analiticaService: AnaliticaService,
    private readonly saldoService: SaldoService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async impacto(eventoId: string, usuarioId: string): Promise<ImpactoEvento> {
    await this.comoCreador(eventoId, usuarioId);

    const [fila] = await db
      .select({
        inscriptos: sql<number>`count(*) filter (where ${inscripciones.estado} = 'inscripto')`,
        inscriptosPagos: sql<number>`count(*) filter (where ${inscripciones.estado} = 'inscripto' and ${inscripciones.pagoConfirmado})`,
        montoAReembolsar: sql<number>`coalesce(sum(${inscripciones.montoCobrado}) filter (where ${inscripciones.estado} = 'inscripto' and ${inscripciones.pagoConfirmado}), 0)`,
        reembolsosPendientes: sql<number>`count(*) filter (where ${inscripciones.estado} = 'cancelada' and ${inscripciones.pagoConfirmado} and ${inscripciones.reembolsadoEn} is null)`,
      })
      .from(inscripciones)
      .where(eq(inscripciones.eventoId, eventoId));

    const [conAsistencia] = await db
      .select({ total: sql<number>`count(*)` })
      .from(asistencias)
      .innerJoin(inscripciones, eq(asistencias.inscripcionId, inscripciones.id))
      .where(
        and(
          eq(inscripciones.eventoId, eventoId),
          eq(inscripciones.estado, 'inscripto'),
        ),
      );

    return {
      eventoId,
      inscriptos: Number(fila?.inscriptos ?? 0),
      inscriptosPagos: Number(fila?.inscriptosPagos ?? 0),
      montoAReembolsar: Number(fila?.montoAReembolsar ?? 0),
      reembolsosPendientes: Number(fila?.reembolsosPendientes ?? 0),
      asistenciasRegistradas: Number(conAsistencia?.total ?? 0),
    };
  }

  async actualizar(
    eventoId: string,
    cambios: ActualizarEvento,
    usuarioId: string,
    ahora: Date = new Date(),
  ): Promise<ResultadoEdicionEvento> {
    const actual = await this.comoCreador(eventoId, usuarioId);

    if (actual.estado === 'cancelado') {
      throw new ConflictException(
        'El evento está cancelado; no se puede modificar.',
      );
    }
    if (ahora.getTime() >= actual.fechaInicio.getTime()) {
      throw new ConflictException(
        'El evento ya comenzó; no se puede modificar.',
      );
    }

    const locacionId = cambios.locacionId ?? actual.locacionId;
    const fechaInicio = cambios.fechaInicio ?? actual.fechaInicio;
    const fechaFin = cambios.fechaFin ?? actual.fechaFin;
    const esPago = cambios.esPago ?? actual.esPago;
    const categoriaPrecio = esPago
      ? cambios.categoriaPrecio !== undefined
        ? cambios.categoriaPrecio
        : actual.categoriaPrecio
      : null;

    if (fechaFin.getTime() <= fechaInicio.getTime()) {
      throw new BadRequestException(
        'fechaFin debe ser posterior a fechaInicio',
      );
    }
    if (esPago && !categoriaPrecio) {
      throw new BadRequestException(
        'categoriaPrecio es obligatoria cuando el evento es pago.',
      );
    }

    const cambioFecha =
      fechaInicio.getTime() !== actual.fechaInicio.getTime() ||
      fechaFin.getTime() !== actual.fechaFin.getTime();
    const cambioLugar = locacionId !== actual.locacionId;
    const reprogramado = cambioFecha || cambioLugar;
    const cambioPrecio =
      esPago !== actual.esPago || categoriaPrecio !== actual.categoriaPrecio;

    if (cambioFecha && fechaInicio.getTime() <= ahora.getTime()) {
      throw new ConflictException('La nueva fecha de inicio ya pasó.');
    }

    const inscriptos = await this.contarInscriptos(eventoId);

    if (cambios.cupoMaximo !== undefined && cambios.cupoMaximo < inscriptos) {
      throw new ConflictException(
        `Ya hay ${inscriptos} inscriptos; el cupo no puede ser menor.`,
      );
    }
    if (cambioPrecio && inscriptos > 0) {
      throw new ConflictException(
        'Ya hay inscriptos: no se puede cambiar si el evento es pago ni su categoría de precio.',
      );
    }
    if (cambioPrecio && esPago && categoriaPrecio) {
      await this.tarifasService.asegurarCargado?.();
      this.tarifasService.exigirPrecio(categoriaPrecio);
    }

    const locacion = await this.obtenerLocacion(locacionId);
    if (cambioLugar && !locacion.aptoEventos) {
      throw new ConflictException(
        'La locación no está habilitada para eventos.',
      );
    }

    if (reprogramado) {
      const choque = await db
        .select({ id: eventos.id })
        .from(eventos)
        .where(
          and(
            eq(eventos.locacionId, locacionId),
            eq(eventos.estado, 'publicado'),
            ne(eventos.id, eventoId),
            lt(eventos.fechaInicio, fechaFin),
            gt(eventos.fechaFin, fechaInicio),
          ),
        )
        .limit(1);
      if (choque.length > 0) {
        throw new ConflictException(
          'La locación ya tiene un evento en ese rango horario.',
        );
      }
    }

    if (cambioFecha) {
      const pisados = await this.inscriptosConOtroEventoEnElHorario(
        eventoId,
        fechaInicio,
        fechaFin,
      );
      if (pisados > 0) {
        throw new ConflictException(
          pisados === 1
            ? 'Con el nuevo horario, 1 inscripto quedaría con otro evento en el mismo horario.'
            : `Con el nuevo horario, ${pisados} inscriptos quedarían con otro evento en el mismo horario.`,
        );
      }
    }

    const actualizados = await db
      .update(eventos)
      .set({
        ...(cambios.titulo !== undefined ? { titulo: cambios.titulo } : {}),
        ...(cambios.descripcion !== undefined
          ? { descripcion: cambios.descripcion }
          : {}),
        ...(cambios.cupoMaximo !== undefined
          ? { cupoMaximo: cambios.cupoMaximo }
          : {}),
        locacionId,
        fechaInicio,
        fechaFin,
        esPago,
        categoriaPrecio,
        ...(reprogramado ? { reprogramadoEn: ahora } : {}),
      })
      .where(eq(eventos.id, eventoId))
      .returning();
    const evento = actualizados[0]!;

    let notificados = 0;
    if (reprogramado) {
      notificados = await this.avisarReprogramacion(
        evento,
        `${locacion.nombre} — ${locacion.sede}`,
        ahora,
      );
    }

    if (reprogramado || cambios.cupoMaximo !== undefined) {
      this.analiticaService.eventoModificado({
        eventoId,
        locacionId,
        sede: locacion.sede,
        cupoMaximo: evento.cupoMaximo,
        fechaInicio: evento.fechaInicio.toISOString(),
        fechaFin: evento.fechaFin.toISOString(),
        reprogramado,
        inscriptosNotificados: notificados,
      });
    }

    return { evento, notificados };
  }

  /**
   * Cancela el evento y devuelve el dinero de cada inscripción paga. Es
   * idempotente: si ya estaba cancelado no vuelve a cambiar nada ni a avisar,
   * solo reintenta los reembolsos que CORE no llegó a confirmar. Por eso el
   * botón "reintentar" de la UI es la misma llamada.
   */
  async cancelar(
    eventoId: string,
    motivo: string,
    usuarioId: string,
    ahora: Date = new Date(),
  ): Promise<ResultadoCancelacionEvento> {
    const evento = await this.comoCreador(eventoId, usuarioId);

    let primeraVez = false;
    if (evento.estado === 'publicado') {
      if (ahora.getTime() >= evento.fechaInicio.getTime()) {
        throw new ConflictException(
          'El evento ya comenzó; no se puede cancelar.',
        );
      }
      const [conAsistencia] = await db
        .select({ total: sql<number>`count(*)` })
        .from(asistencias)
        .innerJoin(
          inscripciones,
          eq(asistencias.inscripcionId, inscripciones.id),
        )
        .where(eq(inscripciones.eventoId, eventoId));
      if (Number(conAsistencia?.total ?? 0) > 0) {
        throw new ConflictException(
          'Ya hay asistencias registradas; no se puede cancelar el evento.',
        );
      }

      const marcados = await db
        .update(eventos)
        .set({
          estado: 'cancelado',
          motivoCancelacion: motivo,
          canceladoEn: ahora,
        })
        .where(and(eq(eventos.id, eventoId), eq(eventos.estado, 'publicado')))
        .returning({ id: eventos.id });
      primeraVez = marcados.length > 0;
    }

    const pendientes = await db
      .select({
        id: inscripciones.id,
        usuarioId: inscripciones.usuarioId,
        estado: inscripciones.estado,
        pagoConfirmado: inscripciones.pagoConfirmado,
        montoCobrado: inscripciones.montoCobrado,
      })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.eventoId, eventoId),
          sql`(${inscripciones.estado} = 'inscripto' or (${inscripciones.estado} = 'cancelada' and ${inscripciones.pagoConfirmado} and ${inscripciones.reembolsadoEn} is null))`,
        ),
      );

    let notificados = 0;
    await enLotes(pendientes, async (inscripcion) => {
      const nueva = inscripcion.estado === 'inscripto';
      const devuelto = await this.reembolsar(
        inscripcion,
        `Cancelación del evento ${evento.titulo}`,
      );

      await db
        .update(inscripciones)
        .set({
          estado: 'cancelada',
          ...(devuelto ? { reembolsadoEn: ahora } : {}),
        })
        .where(eq(inscripciones.id, inscripcion.id));

      if (nueva) {
        const avisado = await this.notificaciones.enviarAviso({
          tipo: 'evento.cancelado',
          usuarioId: inscripcion.usuarioId,
          eventoId,
          titulo: evento.titulo,
          mensaje: mensajeDeCancelacion(
            evento.titulo,
            motivo,
            inscripcion.pagoConfirmado ? inscripcion.montoCobrado : null,
            devuelto,
          ),
          referencia: `evento/${eventoId}/cancelado`,
        });
        if (avisado) notificados += 1;
      }
    });

    const resumen = await this.resumenDeCancelacion(eventoId);

    if (primeraVez) {
      this.analiticaService.eventoCancelado({
        eventoId,
        motivo,
        inscriptosAfectados: resumen.inscriptosAfectados,
        montoReembolsado: resumen.montoReembolsado,
      });
    }

    return { eventoId, ...resumen, notificados };
  }

  /** `true` si el dinero volvió a la cuenta (o la inscripción era gratuita); `false` si queda pendiente. */
  private async reembolsar(
    inscripcion: {
      id: string;
      pagoConfirmado: boolean;
      montoCobrado: number | null;
    },
    motivo: string,
  ): Promise<boolean> {
    if (!inscripcion.pagoConfirmado || inscripcion.montoCobrado === null) {
      return true;
    }

    try {
      const cobro = await this.saldoService.conciliarPorReferencia(
        inscripcion.id,
      );
      if (!cobro) {
        this.logger.warn(
          `No se encontró el cobro de la inscripción ${inscripcion.id} en CORE; el reembolso queda pendiente.`,
        );
        return false;
      }
      // Un intento anterior pudo haber revertido en CORE y fallar después: no se devuelve dos veces.
      if (cobro.status === 'REVERSED') {
        return true;
      }
      const reversa = await this.saldoService.revertir(
        cobro.transactionId,
        motivo,
        inscripcion.montoCobrado,
      );
      return reversa !== null;
    } catch (err) {
      this.logger.warn(
        `Falló el reembolso de la inscripción ${inscripcion.id}: ${String(err)}`,
      );
      return false;
    }
  }

  private async resumenDeCancelacion(eventoId: string) {
    const [fila] = await db
      .select({
        inscriptosAfectados: sql<number>`count(*)`,
        reembolsados: sql<number>`count(*) filter (where ${inscripciones.pagoConfirmado} and ${inscripciones.reembolsadoEn} is not null)`,
        reembolsosPendientes: sql<number>`count(*) filter (where ${inscripciones.pagoConfirmado} and ${inscripciones.reembolsadoEn} is null)`,
        montoReembolsado: sql<number>`coalesce(sum(${inscripciones.montoCobrado}) filter (where ${inscripciones.pagoConfirmado} and ${inscripciones.reembolsadoEn} is not null), 0)`,
      })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.eventoId, eventoId),
          eq(inscripciones.estado, 'cancelada'),
        ),
      );

    return {
      inscriptosAfectados: Number(fila?.inscriptosAfectados ?? 0),
      reembolsados: Number(fila?.reembolsados ?? 0),
      reembolsosPendientes: Number(fila?.reembolsosPendientes ?? 0),
      montoReembolsado: Number(fila?.montoReembolsado ?? 0),
    };
  }

  private async avisarReprogramacion(
    evento: Evento,
    lugar: string,
    ahora: Date,
  ): Promise<number> {
    const inscriptos = await db
      .select({ usuarioId: inscripciones.usuarioId })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.eventoId, evento.id),
          eq(inscripciones.estado, 'inscripto'),
        ),
      );

    let notificados = 0;
    await enLotes(inscriptos, async ({ usuarioId }) => {
      const avisado = await this.notificaciones.enviarAviso({
        tipo: 'evento.reprogramado',
        usuarioId,
        eventoId: evento.id,
        titulo: evento.titulo,
        mensaje: `«${evento.titulo}» ahora es el ${cuando(evento.fechaInicio)} en ${lugar}. Si no podés asistir, podés cancelar tu inscripción sin límite de tiempo${
          evento.esPago ? ' y se te devuelve el saldo' : ''
        }.`,
        referencia: `evento/${evento.id}/reprogramado/${ahora.getTime()}`,
      });
      if (avisado) notificados += 1;
    });
    return notificados;
  }

  private async comoCreador(eventoId: string, usuarioId: string) {
    const encontrados = await db
      .select()
      .from(eventos)
      .where(eq(eventos.id, eventoId))
      .limit(1);

    const evento = encontrados[0];
    if (!evento) {
      throw new NotFoundException('El evento no existe.');
    }
    if (evento.creadoPor !== usuarioId) {
      throw new ForbiddenException(
        'Solo el creador del evento puede modificarlo o cancelarlo.',
      );
    }
    return evento;
  }

  private async contarInscriptos(eventoId: string): Promise<number> {
    const [fila] = await db
      .select({ total: sql<number>`count(*)` })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.eventoId, eventoId),
          eq(inscripciones.estado, 'inscripto'),
        ),
      );
    return Number(fila?.total ?? 0);
  }

  private async obtenerLocacion(locacionId: string) {
    const encontradas = await db
      .select({
        nombre: locaciones.nombre,
        sede: locaciones.sede,
        aptoEventos: locaciones.aptoEventos,
      })
      .from(locaciones)
      .where(eq(locaciones.id, locacionId))
      .limit(1);

    const locacion = encontradas[0];
    if (!locacion) {
      throw new NotFoundException('La locación no existe.');
    }
    return locacion;
  }

  /** Inscriptos de este evento que ya tienen otra inscripción activa que se pisa con el nuevo horario. */
  private async inscriptosConOtroEventoEnElHorario(
    eventoId: string,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<number> {
    const propias = await db
      .select({ usuarioId: inscripciones.usuarioId })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.eventoId, eventoId),
          eq(inscripciones.estado, 'inscripto'),
        ),
      );
    if (propias.length === 0) {
      return 0;
    }

    const otras = await db
      .select({ usuarioId: inscripciones.usuarioId })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(
        and(
          ne(inscripciones.eventoId, eventoId),
          inArray(
            inscripciones.usuarioId,
            propias.map((fila) => fila.usuarioId),
          ),
          eq(inscripciones.estado, 'inscripto'),
          eq(eventos.estado, 'publicado'),
          lt(eventos.fechaInicio, fechaFin),
          gt(eventos.fechaFin, fechaInicio),
        ),
      );

    const conOtro = new Set(otras.map((fila) => fila.usuarioId));
    return propias.filter((fila) => conOtro.has(fila.usuarioId)).length;
  }
}

function mensajeDeCancelacion(
  titulo: string,
  motivo: string,
  montoCobrado: number | null,
  devuelto: boolean,
): string {
  const base = `Se canceló «${titulo}». Motivo: ${motivo}.`;
  if (montoCobrado === null) {
    return base;
  }
  return devuelto
    ? `${base} Te devolvimos ${pesos(montoCobrado)} a tu cuenta institucional.`
    : `${base} Estamos procesando la devolución de ${pesos(montoCobrado)}; vas a ver el reintegro en tu cuenta institucional.`;
}
