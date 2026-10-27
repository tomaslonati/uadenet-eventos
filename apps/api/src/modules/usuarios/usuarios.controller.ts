import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UsuarioBackoffice, WalletBalance } from '@repo/contracts';
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
      'Saldo disponible de la cuenta institucional del usuario logueado desde CORE',
  })
  obtenerSaldoActual(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<WalletBalance> {
    return this.usuariosService.obtenerSaldoActual(usuario.id, usuario.token);
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
