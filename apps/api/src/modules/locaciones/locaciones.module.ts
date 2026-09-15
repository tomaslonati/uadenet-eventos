import { Module } from '@nestjs/common';
import { LocacionesController } from './locaciones.controller';
import { LocacionesService } from './locaciones.service';

@Module({
  controllers: [LocacionesController],
  providers: [LocacionesService],
})
export class LocacionesModule {}
