import { ApiProperty } from '@nestjs/swagger';
import { EventoDto } from './evento.dto';

export class ActualizarEventoDto {
  @ApiProperty({ required: false })
  titulo?: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  locacionId?: string;

  @ApiProperty({
    required: false,
    description: 'No puede ser menor a los inscriptos actuales.',
  })
  cupoMaximo?: number;

  @ApiProperty({ required: false, format: 'date-time' })
  fechaInicio?: string;

  @ApiProperty({ required: false, format: 'date-time' })
  fechaFin?: string;

  @ApiProperty({
    required: false,
    description: 'No se puede cambiar si el evento ya tiene inscriptos.',
  })
  esPago?: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ['general', 'especial'],
    description: 'No se puede cambiar si el evento ya tiene inscriptos.',
  })
  categoriaPrecio?: 'general' | 'especial' | null;
}

export class CancelarEventoDto {
  @ApiProperty({
    maxLength: 500,
    description: 'Se le informa a cada inscripto en el aviso de cancelación.',
  })
  motivo!: string;
}

export class ResultadoEdicionEventoDto {
  @ApiProperty({ type: EventoDto })
  evento!: EventoDto;

  @ApiProperty({
    description:
      'Inscriptos a los que se avisó el cambio de fecha o lugar (0 si el cambio no los afecta).',
  })
  notificados!: number;
}

export class ImpactoEventoDto {
  @ApiProperty({ format: 'uuid' })
  eventoId!: string;

  @ApiProperty()
  inscriptos!: number;

  @ApiProperty()
  inscriptosPagos!: number;

  @ApiProperty({ description: 'Lo cobrado a las inscripciones pagas activas.' })
  montoAReembolsar!: number;

  @ApiProperty({
    description:
      'Reembolsos de una cancelación anterior que CORE todavía no confirmó.',
  })
  reembolsosPendientes!: number;

  @ApiProperty()
  asistenciasRegistradas!: number;
}

export class ResultadoCancelacionEventoDto {
  @ApiProperty({ format: 'uuid' })
  eventoId!: string;

  @ApiProperty()
  inscriptosAfectados!: number;

  @ApiProperty()
  reembolsados!: number;

  @ApiProperty({
    description:
      'Pagos que no se pudieron devolver todavía; repetir la cancelación los reintenta.',
  })
  reembolsosPendientes!: number;

  @ApiProperty()
  montoReembolsado!: number;

  @ApiProperty({
    description: 'Inscriptos a los que se les avisó la cancelación.',
  })
  notificados!: number;
}
