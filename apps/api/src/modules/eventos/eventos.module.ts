import { Module } from '@nestjs/common';
import { BackofficeModule } from '../../common/backoffice/backoffice.module';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

@Module({
  imports: [BackofficeModule],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
