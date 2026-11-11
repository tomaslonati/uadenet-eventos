import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asistencias,
  db,
  eq,
  eventos,
  gt,
  inscripciones,
  lt,
} from '@repo/db';
import { HORAS_ANTICIPACION_CANCELACION } from '@repo/contracts';
import type {
  CancelacionInscripcion,
  CrearInscripcion,
  Inscripcion,
  RolUsuarioDominio,
} from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';
import { SaldoService } from '../../common/core/saldo.service';
import { USUARIO_DEMO, USUARIO_DEMO_ID } from '../../common/usuario-demo';
import { EventosService } from '../eventos/eventos.service';

export interface ActorInscripcion {
  id: string;
  rol: RolUsuarioDominio;
}

@Injectable()
export class InscripcionesService {
  constructor(
    private readonly eventosService: EventosService,
    private readonly saldoService: SaldoService,
    private readonly analiticaService: AnaliticaService,
  ) {}

  async crear(
    datos: CrearInscripcion,
    usuario: ActorInscripcion = USUARIO_DEMO,
  ): Promise<Inscripcion> {
    const evento = await this.eventosService.obtener(
      datos.eventoId,
      usuario.id,
    );

    if (evento.estado === 'cancelado') {
      throw new ConflictException('El evento fue cancelado.');
    }

    if (new Date(evento.fechaFin).getTime() <= Date.now()) {
      throw new ConflictException('El evento ya finalizó.');
    }

    if (evento.disponibles <= 0) {
      throw new ConflictException('El evento no tiene cupo disponible.');
    }

    const superpuestas = await db
      .select({ id: inscripciones.id })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(
        and(
          eq(inscripciones.usuarioId, usuario.id),
          eq(inscripciones.estado, 'inscripto'),
          eq(eventos.estado, 'publicado'),
          lt(eventos.fechaInicio, evento.fechaFin),
          gt(eventos.fechaFin, evento.fechaInicio),
        ),
      )
      .limit(1);

    if (superpuestas.length > 0) {
      throw new ConflictException(
        'Ya tenés una inscripción a un evento en ese horario.',
      );
    }

    const id = randomUUID();
    let transaccionId: string | undefined;

    if (evento.esPago) {
      if (evento.precio === null) {
        throw new ConflictException(
          'No hay una tarifa vigente en Backoffice para este evento; no se puede confirmar la inscripción.',
        );
      }

      const descuento = await this.saldoService.descontar({
        usuarioId: usuario.id,
        monto: evento.precio,
        concepto: `Inscripción a evento: ${evento.titulo}`,
        referenciaId: id,
      });

      if (!descuento.aprobado) {
        throw new ConflictException(
          `No se pudo descontar el saldo institucional: ${descuento.motivo}`,
        );
      }
      transaccionId = descuento.transaccionId;
    }

    let creada: Inscripcion;
    try {
      const creadas = await db
        .insert(inscripciones)
        .values({
          id,
          eventoId: evento.id,
          usuarioId: usuario.id,
          pagoConfirmado: evento.esPago,
          montoCobrado: evento.esPago ? evento.precio : null,
        })
        .returning();
      creada = creadas[0]!;
    } catch (error) {
      if (transaccionId && evento.precio !== null) {
        await this.saldoService.revertir?.(
          transaccionId,
          'Fallo al persistir inscripción en módulo Eventos',
          evento.precio,
        );
      }
      throw error;
    }

    this.analiticaService.inscripcionRegistrada({
      inscripcionId: creada.id,
      eventoId: creada.eventoId,
      usuarioId: creada.usuarioId,
      rol: usuario.rol,
      pagoConfirmado: creada.pagoConfirmado,
    });

    return creada;
  }

  async listar(usuarioId: string = USUARIO_DEMO_ID): Promise<Inscripcion[]> {
    return db
      .select()
      .from(inscripciones)
      .where(eq(inscripciones.usuarioId, usuarioId))
      .orderBy(inscripciones.fechaInscripcion);
  }

  async cancelar(
    inscripcionId: string,
    usuarioId: string = USUARIO_DEMO_ID,
    ahora: Date = new Date(),
  ): Promise<CancelacionInscripcion> {
    const encontradas = await db
      .select({
        id: inscripciones.id,
        estado: inscripciones.estado,
        pagoConfirmado: inscripciones.pagoConfirmado,
        montoCobrado: inscripciones.montoCobrado,
        titulo: eventos.titulo,
        fechaInicio: eventos.fechaInicio,
        reprogramadoEn: eventos.reprogramadoEn,
      })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(
        and(
          eq(inscripciones.id, inscripcionId),
          eq(inscripciones.usuarioId, usuarioId),
        ),
      )
      .limit(1);

    const inscripcion = encontradas[0];
    if (!inscripcion) {
      throw new NotFoundException('No existe esa inscripción.');
    }

    if (inscripcion.estado === 'cancelada') {
      throw new ConflictException(
        'Esta inscripción ya fue cancelada junto con el evento.',
      );
    }

    // Si el creador movió la fecha o el lugar, la persona no eligió ese cambio: puede salirse hasta el inicio.
    const anticipacion = inscripcion.reprogramadoEn
      ? 0
      : HORAS_ANTICIPACION_CANCELACION * 60 * 60_000;
    const limite = inscripcion.fechaInicio.getTime() - anticipacion;
    if (ahora.getTime() > limite) {
      throw new ConflictException(
        `Solo se puede cancelar hasta ${HORAS_ANTICIPACION_CANCELACION} horas antes del inicio del evento.`,
      );
    }

    const conAsistencia = await db
      .select({ id: asistencias.id })
      .from(asistencias)
      .where(eq(asistencias.inscripcionId, inscripcionId))
      .limit(1);
    if (conAsistencia.length > 0) {
      throw new ConflictException(
        'La asistencia ya fue registrada; no se puede cancelar la inscripción.',
      );
    }

    let montoReembolsado: number | null = null;
    if (inscripcion.pagoConfirmado && inscripcion.montoCobrado !== null) {
      const cobro =
        await this.saldoService.conciliarPorReferencia(inscripcionId);
      if (!cobro) {
        throw new ConflictException(
          'No se encontró el cobro en CORE; no se puede devolver el saldo.',
        );
      }

      // Si una cancelación anterior revirtió el cobro pero no llegó a borrar la inscripción, no se devuelve dos veces.
      if (cobro.status !== 'REVERSED') {
        const reversa = await this.saldoService.revertir(
          cobro.transactionId,
          `Cancelación de inscripción a ${inscripcion.titulo}`,
          inscripcion.montoCobrado,
        );
        if (!reversa) {
          throw new ConflictException(
            'No se pudo devolver el saldo en CORE; la inscripción sigue activa.',
          );
        }
      }
      montoReembolsado = inscripcion.montoCobrado;
    }

    await db.delete(inscripciones).where(eq(inscripciones.id, inscripcionId));

    return { inscripcionId, montoReembolsado };
  }
}
