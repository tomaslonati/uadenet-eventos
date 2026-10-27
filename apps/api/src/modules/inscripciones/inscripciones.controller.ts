import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { crearInscripcionSchema, type CrearInscripcion } from '@repo/contracts';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  USUARIO_DEMO,
  type UsuarioAutenticado,
} from '../../common/usuario-demo';
import { CrearInscripcionDto } from './dto/crear-inscripcion.dto';
import { InscripcionDto } from './dto/inscripcion.dto';
import { InscripcionesService } from './inscripciones.service';

@ApiTags('inscripciones')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard)
@Controller({ path: 'inscripciones', version: '1' })
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post()
  @ApiBody({ type: CrearInscripcionDto })
  @ApiCreatedResponse({ type: InscripcionDto })
  crear(
    @Body(new ZodValidationPipe(crearInscripcionSchema))
    datos: CrearInscripcion,
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ) {
    return this.inscripcionesService.crear(datos, usuario);
  }

  @Get()
  @ApiOkResponse({ type: InscripcionDto, isArray: true })
  listar(@UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO) {
    return this.inscripcionesService.listar(usuario.id);
  }
}
