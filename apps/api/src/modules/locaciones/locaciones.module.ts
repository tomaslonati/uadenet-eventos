import { Module } from '@nestjs/common';
import { BackofficeModule } from '../../common/backoffice/backoffice.module';
import { LocacionesController } from './locaciones.controller';
import { LocacionesService } from './locaciones.service';
import { LocacionesSyncService } from './locaciones-sync.service';
import { SedesController } from './sedes.controller';

@Module({
  imports: [BackofficeModule],
  controllers: [LocacionesController, SedesController],
  providers: [LocacionesService, LocacionesSyncService],
  exports: [LocacionesService],
})
export class LocacionesModule {}
