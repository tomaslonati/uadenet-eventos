import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { and, db, eq, eventos, gt, inscripciones, lt } from '@repo/db';
import type { CrearInscripcion, Inscripcion } from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';
import { SaldoService } from '../../common/core/saldo.service';
import { USUARIO_DEMO_ID, USUARIO_DEMO_ROL } from '../../common/usuario-demo';
import { EventosService } from '../eventos/eventos.service';

@Injectable()
export class InscripcionesService {
  constructor(
    private readonly eventosService: EventosService,
    private readonly saldoService: SaldoService,
    private readonly analiticaService: AnaliticaService,
  ) {}

  async crear(datos: CrearInscripcion): Promise<Inscripcion> {
    const evento = await this.eventosService.obtener(datos.eventoId);

    if (evento.disponibles <= 0) {
      throw new ConflictException('El evento no tiene cupo disponible.');
    }

    const superpuestas = await db
      .select({ id: inscripciones.id })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(
        and(
          eq(inscripciones.usuarioId, USUARIO_DEMO_ID),
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

    if (evento.esPago) {
      if (evento.precio === null) {
        throw new ConflictException(
          'No hay una tarifa vigente en Backoffice para este evento; no se puede confirmar la inscripción.',
        );
      }

      const descuento = await this.saldoService.descontar({
        usuarioId: USUARIO_DEMO_ID,
        monto: evento.precio,
        concepto: `Inscripción a evento: ${evento.titulo}`,
        referenciaId: id,
      });

      if (!descuento.aprobado) {
        throw new ConflictException(
          `No se pudo descontar el saldo institucional: ${descuento.motivo}`,
        );
      }
    }

    const creadas = await db
      .insert(inscripciones)
      .values({
        id,
        eventoId: evento.id,
        usuarioId: USUARIO_DEMO_ID,
        pagoConfirmado: evento.esPago,
        montoCobrado: evento.esPago ? evento.precio : null,
      })
      .returning();
    const creada = creadas[0]!;

    this.analiticaService.inscripcionRegistrada({
      inscripcionId: creada.id,
      eventoId: creada.eventoId,
      usuarioId: creada.usuarioId,
      rol: USUARIO_DEMO_ROL,
      pagoConfirmado: creada.pagoConfirmado,
    });

    return creada;
  }

  async listar(): Promise<Inscripcion[]> {
    return db
      .select()
      .from(inscripciones)
      .where(eq(inscripciones.usuarioId, USUARIO_DEMO_ID))
      .orderBy(inscripciones.fechaInscripcion);
  }
}
