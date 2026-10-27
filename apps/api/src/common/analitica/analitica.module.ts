import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { AnaliticaService } from './analitica.service';

@Module({
  imports: [CoreModule],
  providers: [AnaliticaService],
  exports: [AnaliticaService],
})
export class AnaliticaModule {}
