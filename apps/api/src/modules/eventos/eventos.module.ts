import { Module } from '@nestjs/common';
import { AnaliticaModule } from '../../common/analitica/analitica.module';
import { BackofficeModule } from '../../common/backoffice/backoffice.module';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

@Module({
  imports: [BackofficeModule, AnaliticaModule],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
