import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import type {
  CoreNotificationsPage,
  UsuarioBackoffice,
  WalletBalance,
  WalletTransaction,
  WalletTransactionsPage,
} from '@repo/contracts';
import { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { NotificacionesService } from '../../common/core/notificaciones.service';
import { SaldoService } from '../../common/core/saldo.service';
import { USUARIO_DEMO_ID } from '../../common/usuario-demo';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly backofficeClient: BackofficeClient,
    @Optional() private readonly saldoService?: SaldoService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
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
        walletId: '00000000-0000-4000-8000-000000000000',
        userId: usuarioId,
        balance: '10000.00',
        currency: 'ARS',
        updatedAt: new Date().toISOString(),
      };
    }
    return this.saldoService.consultarSaldo(usuarioId, tokenUsuario);
  }

  /** Lista los últimos movimientos de billetera del usuario en CORE (`GET /api/v1/wallets/me/transactions`). */
  async listarMovimientosActual(
    usuarioId: string = USUARIO_DEMO_ID,
    tokenUsuario?: string,
  ): Promise<WalletTransactionsPage> {
    if (!this.saldoService) {
      return { items: [], nextCursor: null };
    }
    return this.saldoService.listarMovimientos(usuarioId, tokenUsuario);
  }

  /** Recarga saldo en la billetera institucional de CORE (`POST /api/v1/wallets/me/top-ups`). */
  async recargarSaldoActual(
    monto: number,
    usuarioId: string = USUARIO_DEMO_ID,
    tokenUsuario?: string,
  ): Promise<WalletTransaction> {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('El monto de recarga debe ser mayor a 0.');
    }
    if (!this.saldoService) {
      throw new BadRequestException('Servicio de billetera no disponible.');
    }
    return this.saldoService.recargarSaldo(usuarioId, monto, tokenUsuario);
  }

  /** Lista las notificaciones del usuario autenticado en CORE (`GET /api/v1/notifications`). */
  async listarNotificacionesActual(
    tokenUsuario?: string,
  ): Promise<CoreNotificationsPage> {
    if (!this.notificacionesService) {
      return { items: [], nextCursor: null };
    }
    return this.notificacionesService.listarDelUsuario(tokenUsuario);
  }

  /** Obtiene los datos de cualquier usuario por su id desde Backoffice Administrativo. */
  async obtener(id: string): Promise<UsuarioBackoffice> {
    return this.backofficeClient.obtenerUsuario(id);
  }
}
