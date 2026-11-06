import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  asistencias,
  db,
  eq,
  eventos,
  inscripciones,
  usuarios,
} from '@repo/db';
import {
  HORAS_ANTICIPACION_ASISTENCIA,
  type Asistencia,
  type AsistenteEvento,
  type RegistrarAsistencia,
} from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';

@Injectable()
export class AsistenciaService {
  constructor(private readonly analiticaService: AnaliticaService) {}

  async listarPorEvento(
    eventoId: string,
    usuarioId?: string,
  ): Promise<AsistenteEvento[]> {
    const eventoEncontrado = await db
      .select({ id: eventos.id, creadoPor: eventos.creadoPor })
      .from(eventos)
      .where(eq(eventos.id, eventoId))
      .limit(1);

    if (eventoEncontrado.length === 0) {
      throw new NotFoundException('El evento no existe.');
    }

    if (!usuarioId || eventoEncontrado[0]!.creadoPor !== usuarioId) {
      throw new ForbiddenException(
        'Solo el creador del evento puede gestionar la asistencia.',
      );
    }

    const filas = await db
      .select({
        inscripcionId: inscripciones.id,
        eventoId: inscripciones.eventoId,
        usuario: {
          id: usuarios.id,
          nombre: usuarios.nombre,
          email: usuarios.email,
          rol: usuarios.rol,
        },
        asistenciaId: asistencias.id,
        confirmadaEn: asistencias.confirmadaEn,
        metodo: asistencias.metodo,
      })
      .from(inscripciones)
      .innerJoin(usuarios, eq(inscripciones.usuarioId, usuarios.id))
      .leftJoin(asistencias, eq(asistencias.inscripcionId, inscripciones.id))
      .where(eq(inscripciones.eventoId, eventoId))
      .orderBy(inscripciones.fechaInscripcion);

    return filas.map((fila) => {
      const asistencia: Asistencia | null =
        fila.asistenciaId && fila.confirmadaEn && fila.metodo
          ? {
              id: fila.asistenciaId,
              inscripcionId: fila.inscripcionId,
              confirmadaEn: fila.confirmadaEn,
              metodo: fila.metodo,
            }
          : null;

      return {
        inscripcionId: fila.inscripcionId,
        eventoId: fila.eventoId,
        usuario: fila.usuario,
        acreditado: asistencia !== null,
        asistencia,
      };
    });
  }

  async registrar(
    datos: RegistrarAsistencia,
    usuarioId?: string,
    ahora: Date = new Date(),
  ): Promise<Asistencia> {
    const encontradas = await db
      .select({
        id: inscripciones.id,
        eventoId: inscripciones.eventoId,
        usuarioId: inscripciones.usuarioId,
        eventoCreadoPor: eventos.creadoPor,
        fechaInicio: eventos.fechaInicio,
      })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(eq(inscripciones.id, datos.inscripcionId))
      .limit(1);

    if (encontradas.length === 0) {
      throw new ConflictException(
        'No existe una inscripción activa para registrar la asistencia.',
      );
    }

    const inscripcion = encontradas[0]!;

    if (datos.eventoId && inscripcion.eventoId !== datos.eventoId) {
      throw new BadRequestException(
        'La inscripción no corresponde al evento seleccionado.',
      );
    }

    if (!usuarioId || inscripcion.eventoCreadoPor !== usuarioId) {
      throw new ForbiddenException(
        'Solo el creador del evento puede registrar la asistencia.',
      );
    }

    const inicioHabilitacion =
      inscripcion.fechaInicio.getTime() -
      HORAS_ANTICIPACION_ASISTENCIA * 60 * 60_000;

    if (ahora.getTime() < inicioHabilitacion) {
      throw new ConflictException(
        'La asistencia solo puede registrarse a partir de 1 hora antes del inicio del evento.',
      );
    }

    const yaRegistrada = await db
      .select({ id: asistencias.id })
      .from(asistencias)
      .where(eq(asistencias.inscripcionId, datos.inscripcionId))
      .limit(1);

    if (yaRegistrada.length > 0) {
      throw new ConflictException(
        'La asistencia de esa inscripción ya fue registrada.',
      );
    }

    let registrada: Asistencia;
    try {
      const registradas = await db
        .insert(asistencias)
        .values({
          inscripcionId: datos.inscripcionId,
          metodo: datos.metodo,
        })
        .returning();
      registrada = registradas[0]!;
    } catch (error: unknown) {
      const err = error as {
        code?: string;
        cause?: { code?: string };
        message?: string;
      };
      if (
        err?.code === '23505' ||
        err?.cause?.code === '23505' ||
        /23505|unique/i.test(err?.message ?? '')
      ) {
        throw new ConflictException(
          'La asistencia de esa inscripción ya fue registrada.',
        );
      }
      throw error;
    }

    this.analiticaService.asistenciaConfirmada({
      inscripcionId: registrada.inscripcionId,
      eventoId: inscripcion.eventoId,
      usuarioId: inscripcion.usuarioId,
      confirmadaEn: registrada.confirmadaEn.toISOString(),
    });

    return registrada;
  }

  async revertir(
    inscripcionId: string,
    usuarioId?: string,
    eventoId?: string,
  ): Promise<{ exito: boolean }> {
    const encontradas = await db
      .select({
        id: inscripciones.id,
        eventoId: inscripciones.eventoId,
        eventoCreadoPor: eventos.creadoPor,
      })
      .from(inscripciones)
      .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
      .where(eq(inscripciones.id, inscripcionId))
      .limit(1);

    if (encontradas.length === 0) {
      throw new NotFoundException(
        'No existe la inscripción especificada para revertir la asistencia.',
      );
    }

    const inscripcion = encontradas[0]!;

    if (eventoId && inscripcion.eventoId !== eventoId) {
      throw new BadRequestException(
        'La inscripción no corresponde al evento seleccionado.',
      );
    }

    if (!usuarioId || inscripcion.eventoCreadoPor !== usuarioId) {
      throw new ForbiddenException(
        'Solo el creador del evento puede modificar la asistencia.',
      );
    }

    await db
      .delete(asistencias)
      .where(eq(asistencias.inscripcionId, inscripcionId));

    return { exito: true };
  }
}
