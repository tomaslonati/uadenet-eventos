import { Injectable } from '@nestjs/common';
import { db, locaciones } from '@repo/db';
import type { Locacion, SedeBackoffice } from '@repo/contracts';
import { BackofficeClient } from '../../common/backoffice/backoffice.client';

@Injectable()
export class LocacionesService {
  constructor(private readonly backofficeClient: BackofficeClient) {}

  async listar(): Promise<Locacion[]> {
    return db.select().from(locaciones).orderBy(locaciones.nombre);
  }

  async listarSedes(): Promise<SedeBackoffice[]> {
    return this.backofficeClient.listarSedes();
  }
}
