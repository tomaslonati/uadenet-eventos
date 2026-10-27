import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  registrarAsistenciaSchema,
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
