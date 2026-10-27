import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UsuarioBackoffice } from '@repo/contracts';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@UseGuards(CoreJwtGuard)
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @ApiOkResponse({
    description:
      'Datos del usuario logueado obtenidos desde Backoffice Administrativo',
  })
  obtenerActual(): Promise<UsuarioBackoffice> {
    return this.usuariosService.obtenerActual();
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
