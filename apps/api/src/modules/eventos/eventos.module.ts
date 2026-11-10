import { Module } from '@nestjs/common';
import { AnaliticaModule } from '../../common/analitica/analitica.module';
import { BackofficeModule } from '../../common/backoffice/backoffice.module';
import { EventosController } from './eventos.controller';
import { EventosGestionService } from './eventos-gestion.service';
import { EventosService } from './eventos.service';

@Module({
  imports: [BackofficeModule, AnaliticaModule],
  controllers: [EventosController],
  providers: [EventosService, EventosGestionService],
  exports: [EventosService],
})
export class EventosModule {}
