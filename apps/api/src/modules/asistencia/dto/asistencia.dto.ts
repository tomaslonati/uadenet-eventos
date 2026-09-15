import { ApiProperty } from '@nestjs/swagger';

export class AsistenciaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inscripcionId!: string;

  @ApiProperty({ format: 'date-time' })
  confirmadaEn!: Date;

  @ApiProperty({ enum: ['qr', 'codigo-en-sala', 'manual'] })
  metodo!: 'qr' | 'codigo-en-sala' | 'manual';
}
