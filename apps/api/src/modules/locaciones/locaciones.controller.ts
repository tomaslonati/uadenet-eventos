import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { LocacionDto } from './dto/locacion.dto';
import { LocacionesService } from './locaciones.service';

@ApiTags('locaciones')
@UseGuards(CoreJwtGuard)
@Controller({ path: 'locaciones', version: '1' })
export class LocacionesController {
  constructor(private readonly locacionesService: LocacionesService) {}

  @Get()
  @ApiOkResponse({ type: LocacionDto, isArray: true })
  listar() {
    return this.locacionesService.listar();
  }
}
