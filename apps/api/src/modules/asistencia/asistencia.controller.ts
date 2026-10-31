import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  registrarAsistenciaSchema,
  type AsistenteEvento,
  type RegistrarAsistencia,
} from '@repo/contracts';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { UsuarioAutenticado } from '../../common/usuario-demo';
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
  @RequierePermiso('campus-events:manage')
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
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ): Promise<AsistenteEvento[]> {
    return this.asistenciaService.listarPorEvento(eventoId, usuario?.id);
  }

  @Post()
  @RequierePermiso('campus-events:manage')
  @ApiBody({ type: RegistrarAsistenciaDto })
  @ApiCreatedResponse({ type: AsistenciaDto })
  registrar(
    @Body(new ZodValidationPipe(registrarAsistenciaSchema))
    datos: RegistrarAsistencia,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return this.asistenciaService.registrar(datos, usuario?.id);
  }

  @Delete(':inscripcionId')
  @RequierePermiso('campus-events:manage')
  @ApiParam({
    name: 'inscripcionId',
    required: true,
    type: String,
    format: 'uuid',
    description: 'ID de la inscripción cuya asistencia se desea revertir',
  })
  @ApiQuery({
    name: 'eventoId',
    required: false,
    type: String,
    format: 'uuid',
    description: 'ID opcional del evento para verificar pertenencia',
  })
  @ApiOkResponse({
    description: 'Asistencia revertida correctamente',
    schema: {
      type: 'object',
      properties: { exito: { type: 'boolean' } },
    },
  })
  revertir(
    @Param('inscripcionId', ParseUUIDPipe) inscripcionId: string,
    @Query('eventoId', new ParseUUIDPipe({ optional: true })) eventoId?: string,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return this.asistenciaService.revertir(
      inscripcionId,
      usuario?.id,
      eventoId,
    );
  }

  @Delete(':inscripcionId')
  @HttpCode(204)
  @RequierePermiso('campus-events:manage')
  @ApiNoContentResponse({
    description:
      'Quita la asistencia registrada por error; la persona vuelve a figurar como pendiente.',
  })
  quitar(@Param('inscripcionId', ParseUUIDPipe) inscripcionId: string) {
    return this.asistenciaService.quitar(inscripcionId);
  }
}
