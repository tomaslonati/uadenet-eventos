import { ApiProperty } from '@nestjs/swagger';

export class RegistrarAsistenciaDto {
  @ApiProperty({ format: 'uuid' })
  inscripcionId!: string;

  @ApiProperty({ enum: ['qr', 'codigo-en-sala', 'manual'] })
  metodo!: 'qr' | 'codigo-en-sala' | 'manual';
}
