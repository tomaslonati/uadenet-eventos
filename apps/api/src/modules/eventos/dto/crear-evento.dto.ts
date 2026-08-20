import { ApiProperty } from '@nestjs/swagger';

export class CrearEventoDto {
  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ format: 'uuid' })
  locacionId!: string;

  @ApiProperty()
  cupoMaximo!: number;

  @ApiProperty({ format: 'date-time' })
  fechaInicio!: string;

  @ApiProperty({ format: 'date-time' })
  fechaFin!: string;

  @ApiProperty()
  esPago!: boolean;

  @ApiProperty({ required: false, nullable: true })
  precio?: number | null;
}
