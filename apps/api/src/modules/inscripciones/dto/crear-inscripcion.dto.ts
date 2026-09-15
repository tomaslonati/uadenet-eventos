import { ApiProperty } from '@nestjs/swagger';

export class CrearInscripcionDto {
  @ApiProperty({ format: 'uuid' })
  eventoId!: string;
}
