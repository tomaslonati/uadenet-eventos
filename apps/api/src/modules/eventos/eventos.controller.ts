import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { crearEventoSchema, type CrearEvento } from '@repo/contracts';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { EventoDto } from './dto/evento.dto';
import { EventosService } from './eventos.service';

@ApiTags('eventos')
@UseGuards(CoreJwtGuard)
@Controller({ path: 'eventos', version: '1' })
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  @ApiBody({ type: CrearEventoDto })
  @ApiCreatedResponse({ type: EventoDto })
  crear(@Body(new ZodValidationPipe(crearEventoSchema)) datos: CrearEvento) {
    return this.eventosService.crear(datos);
  }

  @Get()
  @ApiOkResponse({ type: EventoDto, isArray: true })
  listar() {
    return this.eventosService.listar();
  }
}
