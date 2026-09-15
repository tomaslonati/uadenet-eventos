import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  crearEventoSchema,
  filtroEventosSchema,
  type CrearEvento,
  type FiltroEventos,
} from '@repo/contracts';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { CupoDto } from './dto/cupo.dto';
import { EventoDeCarteleraDto } from './dto/evento-de-cartelera.dto';
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
  @ApiQuery({
    name: 'desde',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiQuery({
    name: 'hasta',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiOkResponse({ type: EventoDeCarteleraDto, isArray: true })
  listar(
    @Query(new ZodValidationPipe(filtroEventosSchema)) filtro: FiltroEventos,
  ) {
    return this.eventosService.listar(filtro);
  }

  @Get(':id')
  @ApiOkResponse({ type: EventoDeCarteleraDto })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventosService.obtener(id);
  }

  @Get(':id/cupo')
  @ApiOkResponse({ type: CupoDto })
  cupo(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventosService.cupo(id);
  }
}
