import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { EventosModule } from './modules/eventos/eventos.module';

@Module({
  imports: [HealthModule, EventosModule],
})
export class AppModule {}
