import { ApiProperty } from '@nestjs/swagger';

export class LocacionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  sede!: string;

  @ApiProperty()
  capacidad!: number;
}
