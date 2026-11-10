import { Module } from '@nestjs/common';
import { RecordatoriosService } from '../../workers/recordatorios.service';
import { LocacionesModule } from '../locaciones/locaciones.module';
import { CronController } from './cron.controller';

@Module({
  imports: [LocacionesModule],
  controllers: [CronController],
  providers: [RecordatoriosService],
  exports: [RecordatoriosService],
})
export class CronModule {}
