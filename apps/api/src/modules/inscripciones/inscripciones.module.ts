import { Module } from '@nestjs/common';
import { CoreModule } from '../../common/core/core.module';
import { EventosModule } from '../eventos/eventos.module';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesService } from './inscripciones.service';

@Module({
  imports: [EventosModule, CoreModule],
  controllers: [InscripcionesController],
  providers: [InscripcionesService],
})
export class InscripcionesModule {}
