import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { SedeBackoffice } from '@repo/contracts';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { LocacionesService } from './locaciones.service';

@ApiTags('sedes')
@UseGuards(CoreJwtGuard)
@Controller({ path: 'sedes', version: '1' })
export class SedesController {
  constructor(private readonly locacionesService: LocacionesService) {}

  @Get()
  @ApiOkResponse({
    description: 'Listado de sedes consumido desde Backoffice Administrativo',
  })
  listar(): Promise<SedeBackoffice[]> {
    return this.locacionesService.listarSedes();
  }
}
