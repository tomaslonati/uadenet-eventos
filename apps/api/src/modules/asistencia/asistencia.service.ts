import { ConflictException, Injectable } from '@nestjs/common';
import { asistencias, db, eq, inscripciones, usuarios } from '@repo/db';
import type {
  Asistencia,
  AsistenteEvento,
  RegistrarAsistencia,
} from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';

@Injectable()
export class AsistenciaService {
  constructor(private readonly analiticaService: AnaliticaService) {}

  async listarPorEvento(eventoId: string): Promise<AsistenteEvento[]> {
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

  async registrar(datos: RegistrarAsistencia): Promise<Asistencia> {
    const encontradas = await db
      .select({
        id: inscripciones.id,
        eventoId: inscripciones.eventoId,
        usuarioId: inscripciones.usuarioId,
      })
      .from(inscripciones)
      .where(eq(inscripciones.id, datos.inscripcionId))
      .limit(1);

    if (encontradas.length === 0) {
      throw new ConflictException(
        'No existe una inscripción activa para registrar la asistencia.',
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

    const registradas = await db.insert(asistencias).values(datos).returning();
    const registrada = registradas[0]!;

    this.analiticaService.asistenciaConfirmada({
      inscripcionId: registrada.inscripcionId,
      eventoId: encontradas[0]!.eventoId,
      usuarioId: encontradas[0]!.usuarioId,
      confirmadaEn: registrada.confirmadaEn.toISOString(),
    });

    return registrada;
  }
}
