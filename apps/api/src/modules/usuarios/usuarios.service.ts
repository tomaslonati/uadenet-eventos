import { Injectable, Optional } from '@nestjs/common';
import type { UsuarioBackoffice, WalletBalance } from '@repo/contracts';
import { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { SaldoService } from '../../common/core/saldo.service';
import { USUARIO_DEMO_ID } from '../../common/usuario-demo';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly backofficeClient: BackofficeClient,
    @Optional() private readonly saldoService?: SaldoService,
  ) {}

  /** Obtiene los datos del usuario actualmente autenticado desde Backoffice Administrativo. */
  async obtenerActual(
    usuarioId: string = USUARIO_DEMO_ID,
  ): Promise<UsuarioBackoffice> {
    return this.backofficeClient.obtenerUsuario(usuarioId);
  }

  /** Consulta el saldo institucional del usuario autenticado en CORE (`GET /api/v1/wallets/me`). */
  async obtenerSaldoActual(
    usuarioId: string = USUARIO_DEMO_ID,
    tokenUsuario?: string,
  ): Promise<WalletBalance> {
    if (!this.saldoService) {
      return {
        userId: usuarioId,
        balance: '10000.00',
        currency: 'ARS',
        status: 'ACTIVE',
      };
    }
    return this.saldoService.consultarSaldo(usuarioId, tokenUsuario);
  }

  /** Obtiene los datos de cualquier usuario por su id desde Backoffice Administrativo. */
  async obtener(id: string): Promise<UsuarioBackoffice> {
    return this.backofficeClient.obtenerUsuario(id);
  }
}
