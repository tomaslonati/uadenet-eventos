import { ApiProperty } from '@nestjs/swagger';

export class EventoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ format: 'uuid' })
  locacionId!: string;

  @ApiProperty()
  cupoMaximo!: number;

  @ApiProperty({ format: 'date-time' })
  fechaInicio!: Date;

  @ApiProperty({ format: 'date-time' })
  fechaFin!: Date;

  @ApiProperty()
  esPago!: boolean;

  @ApiProperty({ nullable: true, enum: ['general', 'especial'] })
  categoriaPrecio!: 'general' | 'especial' | null;

  @ApiProperty()
  creadoPor!: string;

  @ApiProperty({ enum: ['publicado', 'cancelado'] })
  estado!: 'publicado' | 'cancelado';

  @ApiProperty({ nullable: true })
  motivoCancelacion!: string | null;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    description:
      'Si cambió la fecha o el lugar: desde ahí se puede cancelar la inscripción sin el límite de 24 hs.',
  })
  reprogramadoEn!: Date | null;
}
