import { ApiProperty } from '@nestjs/swagger';
import { EventoDto } from './evento.dto';

class LocacionResumenDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  sede!: string;
}

export class EventoDeCarteleraDto extends EventoDto {
  @ApiProperty({ type: LocacionResumenDto })
  locacion!: LocacionResumenDto;

  @ApiProperty()
  inscriptos!: number;

  @ApiProperty()
  disponibles!: number;

  @ApiProperty({ description: 'Si el usuario del JWT ya está inscripto.' })
  yaInscripto!: boolean;
}
