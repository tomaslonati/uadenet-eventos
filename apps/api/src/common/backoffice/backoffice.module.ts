import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { BackofficeClient } from './backoffice.client';
import { TarifasService } from './tarifas.service';

@Module({
  imports: [CoreModule],
  providers: [BackofficeClient, TarifasService],
  exports: [BackofficeClient, TarifasService],
})
export class BackofficeModule {}
