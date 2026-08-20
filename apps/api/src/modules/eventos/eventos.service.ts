import { ConflictException, Injectable } from '@nestjs/common';
import { and, db, eq, eventos, gt, lt } from '@repo/db';
import type { CrearEvento, Evento } from '@repo/contracts';

/**
 * Id fijo hasta que common/guards/core-jwt.guard.ts deje de ser placeholder
 * y exponga el usuario real del JWT de CORE (ver docs/02-arquitectura/integraciones.md).
 * Sembrado por packages/db/src/seed.ts.
 */
const CREADOR_DEMO_ID = 'seed-admin-demo';

@Injectable()
export class EventosService {
  async crear(datos: CrearEvento): Promise<Evento> {
    const conflicto = await db
      .select({ id: eventos.id })
      .from(eventos)
      .where(
        and(
          eq(eventos.locacionId, datos.locacionId),
          lt(eventos.fechaInicio, datos.fechaFin),
          gt(eventos.fechaFin, datos.fechaInicio),
        ),
      )
      .limit(1);

    if (conflicto.length > 0) {
      throw new ConflictException(
        'La locación ya tiene un evento en ese rango horario.',
      );
    }

    const creados = await db
      .insert(eventos)
      .values({ ...datos, creadoPor: CREADOR_DEMO_ID })
      .returning();

    return creados[0]!;
  }

  async listar(): Promise<Evento[]> {
    return db.select().from(eventos).orderBy(eventos.fechaInicio);
  }
}
