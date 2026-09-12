import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { InscripcionesModule } from './modules/inscripciones/inscripciones.module';
import { LocacionesModule } from './modules/locaciones/locaciones.module';

@Module({
  imports: [
    HealthModule,
    EventosModule,
    LocacionesModule,
    InscripcionesModule,
    AsistenciaModule,
  ],
})
export class AppModule {}
