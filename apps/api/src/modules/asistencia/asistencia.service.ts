import { ConflictException, Injectable } from '@nestjs/common';
import { asistencias, db, eq, inscripciones } from '@repo/db';
import type { Asistencia, RegistrarAsistencia } from '@repo/contracts';
import { AnaliticaService } from '../../common/analitica/analitica.service';

@Injectable()
export class AsistenciaService {
  constructor(private readonly analiticaService: AnaliticaService) {}

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
