import { Injectable } from '@nestjs/common';
import { db, locaciones } from '@repo/db';
import type { Locacion } from '@repo/contracts';

@Injectable()
export class LocacionesService {
  async listar(): Promise<Locacion[]> {
    return db.select().from(locaciones).orderBy(locaciones.nombre);
  }
}
