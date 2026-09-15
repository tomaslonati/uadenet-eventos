import { ApiProperty } from '@nestjs/swagger';

export class CupoDto {
  @ApiProperty({ format: 'uuid' })
  eventoId!: string;

  @ApiProperty()
  cupoMaximo!: number;

  @ApiProperty()
  inscriptos!: number;

  @ApiProperty()
  disponibles!: number;
}
