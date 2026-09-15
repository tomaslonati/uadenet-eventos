import { ConflictException, Injectable } from '@nestjs/common';
import { asistencias, db, eq, inscripciones } from '@repo/db';
import type { Asistencia, RegistrarAsistencia } from '@repo/contracts';

@Injectable()
export class AsistenciaService {
  async registrar(datos: RegistrarAsistencia): Promise<Asistencia> {
    const encontradas = await db
      .select({ id: inscripciones.id })
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

    return registradas[0]!;
  }
}
