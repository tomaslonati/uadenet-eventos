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

  @ApiProperty({
    enum: ['inscripto', 'cancelada'],
    description:
      '`cancelada` es la baja que deja el creador al cancelar el evento.',
  })
  estado!: 'inscripto' | 'cancelada';

  @ApiProperty()
  pagoConfirmado!: boolean;

  @ApiProperty({ nullable: true })
  montoCobrado!: number | null;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    description:
      'Cuándo se devolvió el pago; null en una inscripción paga cancelada significa reembolso pendiente.',
  })
  reembolsadoEn!: Date | null;
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
