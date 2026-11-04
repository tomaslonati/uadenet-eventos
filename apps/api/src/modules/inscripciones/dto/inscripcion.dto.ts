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

  @ApiProperty({ nullable: true })
  montoCobrado!: number | null;
}

export class CancelacionInscripcionDto {
  @ApiProperty({ format: 'uuid' })
  inscripcionId!: string;

  @ApiProperty({
    nullable: true,
    description:
      'Monto devuelto a la cuenta institucional; null si la inscripción era gratuita.',
  })
  montoReembolsado!: number | null;
}
