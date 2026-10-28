import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  registrarAsistenciaSchema,
  type AsistenteEvento,
  type RegistrarAsistencia,
} from '@repo/contracts';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AsistenciaService } from './asistencia.service';
import { AsistenciaDto } from './dto/asistencia.dto';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';

@ApiTags('asistencia')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard)
@Controller({ path: 'asistencia', version: '1' })
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Get()
  @ApiQuery({
    name: 'eventoId',
    required: true,
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description:
      'Listado de personas inscriptas al evento con su estado de acreditación en tiempo real',
  })
  listarPorEvento(
    @Query('eventoId', ParseUUIDPipe) eventoId: string,
  ): Promise<AsistenteEvento[]> {
    return this.asistenciaService.listarPorEvento(eventoId);
  }

  @Post()
  @RequierePermiso('campus-events:manage')
  @ApiBody({ type: RegistrarAsistenciaDto })
  @ApiCreatedResponse({ type: AsistenciaDto })
  registrar(
    @Body(new ZodValidationPipe(registrarAsistenciaSchema))
    datos: RegistrarAsistencia,
  ) {
    return this.asistenciaService.registrar(datos);
  }
}
