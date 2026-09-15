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

  @ApiProperty({ nullable: true })
  precio!: number | null;

  @ApiProperty()
  creadoPor!: string;
}
