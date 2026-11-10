import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
  actualizarEventoSchema,
  cancelarEventoSchema,
  crearEventoSchema,
  filtroEventosSchema,
  type ActualizarEvento,
  type CancelarEvento,
  type CrearEvento,
  type FiltroEventos,
} from '@repo/contracts';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  USUARIO_DEMO,
  type UsuarioAutenticado,
} from '../../common/usuario-demo';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { CupoDto } from './dto/cupo.dto';
import { EventoDeCarteleraDto } from './dto/evento-de-cartelera.dto';
import { EventoDto } from './dto/evento.dto';
import {
  ActualizarEventoDto,
  CancelarEventoDto,
  ImpactoEventoDto,
  ResultadoCancelacionEventoDto,
  ResultadoEdicionEventoDto,
} from './dto/gestion-evento.dto';
import { EventosGestionService } from './eventos-gestion.service';
import { EventosService } from './eventos.service';

@ApiTags('eventos')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard)
@Controller({ path: 'eventos', version: '1' })
export class EventosController {
  constructor(
    private readonly eventosService: EventosService,
    private readonly gestionService: EventosGestionService,
  ) {}

  @Post()
  @RequierePermiso('campus-events:manage')
  @ApiBody({ type: CrearEventoDto })
  @ApiCreatedResponse({ type: EventoDto })
  crear(
    @Body(new ZodValidationPipe(crearEventoSchema)) datos: CrearEvento,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return usuario
      ? this.eventosService.crear(datos, usuario.id)
      : this.eventosService.crear(datos);
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
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return usuario
      ? this.eventosService.listar(filtro, usuario.id)
      : this.eventosService.listar(filtro);
  }

  @Get(':id')
  @ApiOkResponse({ type: EventoDeCarteleraDto })
  obtener(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return usuario
      ? this.eventosService.obtener(id, usuario.id)
      : this.eventosService.obtener(id);
  }

  @Patch(':id')
  @RequierePermiso('campus-events:manage')
  @ApiBody({ type: ActualizarEventoDto })
  @ApiOkResponse({
    type: ResultadoEdicionEventoDto,
    description:
      'Solo el creador, y solo antes de que empiece. Si cambia la fecha o la locación se avisa a los inscriptos y se les habilita cancelar sin el límite de 24 hs.',
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(actualizarEventoSchema))
    cambios: ActualizarEvento,
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ) {
    return this.gestionService.actualizar(id, cambios, usuario.id);
  }

  @Get(':id/impacto')
  @RequierePermiso('campus-events:manage')
  @ApiOkResponse({
    type: ImpactoEventoDto,
    description:
      'Lo que se mueve si el creador cancela el evento: inscriptos, monto a reembolsar y reembolsos pendientes.',
  })
  impacto(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ) {
    return this.gestionService.impacto(id, usuario.id);
  }

  @Post(':id/cancelacion')
  @HttpCode(200)
  @RequierePermiso('campus-events:manage')
  @ApiBody({ type: CancelarEventoDto })
  @ApiOkResponse({
    type: ResultadoCancelacionEventoDto,
    description:
      'Cancela el evento, devuelve el pago de cada inscripción paga (reversa en CORE) y avisa a todos los inscriptos. Es idempotente: repetirla reintenta solo los reembolsos pendientes.',
  })
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(cancelarEventoSchema)) datos: CancelarEvento,
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ) {
    return this.gestionService.cancelar(id, datos.motivo, usuario.id);
  }

  @Get(':id/cupo')
  @ApiOkResponse({ type: CupoDto })
  cupo(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventosService.cupo(id);
  }
}
