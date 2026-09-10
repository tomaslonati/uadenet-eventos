import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { crearInscripcionSchema, type CrearInscripcion } from '@repo/contracts';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrearInscripcionDto } from './dto/crear-inscripcion.dto';
import { InscripcionDto } from './dto/inscripcion.dto';
import { InscripcionesService } from './inscripciones.service';

@ApiTags('inscripciones')
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
  ) {
    return this.inscripcionesService.crear(datos);
  }

  @Get()
  @ApiOkResponse({ type: InscripcionDto, isArray: true })
  listar() {
    return this.inscripcionesService.listar();
  }
}
