import { Module } from '@nestjs/common';
import { USA_BACKOFFICE_MOCK } from './common/backoffice/backoffice.client';
import { BackofficeMockModule } from './common/backoffice/backoffice-mock.module';
import { HealthModule } from './health/health.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { InscripcionesModule } from './modules/inscripciones/inscripciones.module';
import { LocacionesModule } from './modules/locaciones/locaciones.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    HealthModule,
    EventosModule,
    LocacionesModule,
    InscripcionesModule,
    AsistenciaModule,
    UsuariosModule,
    ...(USA_BACKOFFICE_MOCK ? [BackofficeMockModule] : []),
  ],
})
export class AppModule {}
