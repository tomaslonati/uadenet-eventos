import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type {
  CoreNotificationsPage,
  UsuarioBackoffice,
  WalletBalance,
  WalletTransaction,
  WalletTransactionsPage,
} from '@repo/contracts';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import {
  USUARIO_DEMO,
  type UsuarioAutenticado,
} from '../../common/usuario-demo';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard)
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @ApiOkResponse({
    description:
      'Datos del usuario logueado obtenidos desde Backoffice Administrativo',
  })
  obtenerActual(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<UsuarioBackoffice> {
    return this.usuariosService.obtenerActual(usuario.id);
  }

  @Get('me/saldo')
  @ApiOkResponse({
    description:
      'Saldo disponible de la cuenta institucional del usuario logueado desde CORE (GET /api/v1/wallets/me)',
  })
  obtenerSaldoActual(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<WalletBalance> {
    return this.usuariosService.obtenerSaldoActual(usuario.id, usuario.token);
  }

  @Get('me/movimientos')
  @ApiOkResponse({
    description:
      'Movimientos de la cuenta institucional del usuario en CORE (GET /api/v1/wallets/me/transactions)',
  })
  listarMovimientosActual(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<WalletTransactionsPage> {
    return this.usuariosService.listarMovimientosActual(
      usuario.id,
      usuario.token,
    );
  }

  @Post('me/recargas')
  @ApiCreatedResponse({
    description:
      'Recarga saldo institucional del usuario en CORE (POST /api/v1/wallets/me/top-ups)',
  })
  recargarSaldoActual(
    @Body() body: { monto?: number },
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<WalletTransaction> {
    return this.usuariosService.recargarSaldoActual(
      Number(body?.monto ?? 0),
      usuario.id,
      usuario.token,
    );
  }

  @Get('me/notificaciones')
  @ApiOkResponse({
    description:
      'Notificaciones del usuario autenticado desde CORE (GET /api/v1/notifications)',
  })
  listarNotificacionesActual(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<CoreNotificationsPage> {
    return this.usuariosService.listarNotificacionesActual(usuario.token);
  }

  @Get(':id')
  @ApiOkResponse({
    description:
      'Datos de un usuario por id obtenidos desde Backoffice Administrativo',
  })
  obtener(@Param('id') id: string): Promise<UsuarioBackoffice> {
    return this.usuariosService.obtener(id);
  }
}
