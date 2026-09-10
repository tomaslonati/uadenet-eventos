import { ApiProperty } from '@nestjs/swagger';

export class InscripcionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  eventoId!: string;

  @ApiProperty()
  usuarioId!: string;

  @ApiProperty({ format: 'date-time' })
  fechaInscripcion!: Date;

  @ApiProperty({ enum: ['inscripto'] })
  estado!: 'inscripto';

  @ApiProperty()
  pagoConfirmado!: boolean;
}
