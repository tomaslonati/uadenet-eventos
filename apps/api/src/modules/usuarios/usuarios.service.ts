import { Injectable } from '@nestjs/common';
import type { UsuarioBackoffice } from '@repo/contracts';
import { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { USUARIO_DEMO_ID } from '../../common/usuario-demo';

@Injectable()
export class UsuariosService {
  constructor(private readonly backofficeClient: BackofficeClient) {}

  /** Obtiene los datos del usuario actualmente autenticado desde Backoffice Administrativo. */
  async obtenerActual(): Promise<UsuarioBackoffice> {
    return this.backofficeClient.obtenerUsuario(USUARIO_DEMO_ID);
  }

  /** Obtiene los datos de cualquier usuario por su id desde Backoffice Administrativo. */
  async obtener(id: string): Promise<UsuarioBackoffice> {
    return this.backofficeClient.obtenerUsuario(id);
  }
}
