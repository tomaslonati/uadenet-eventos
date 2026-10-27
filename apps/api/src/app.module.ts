import { Module } from '@nestjs/common';
import { USA_BACKOFFICE_MOCK } from './common/backoffice/backoffice.client';
import { BackofficeMockModule } from './common/backoffice/backoffice-mock.module';
import { USA_CORE_MOCK } from './common/core/core-crypto';
import { CoreMockModule } from './common/core/core-mock.module';
import { CoreModule } from './common/core/core.module';
import { HealthModule } from './health/health.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { InscripcionesModule } from './modules/inscripciones/inscripciones.module';
import { LocacionesModule } from './modules/locaciones/locaciones.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RecordatoriosService } from './workers/recordatorios.service';

@Module({
  imports: [
    CoreModule,
    HealthModule,
    EventosModule,
    LocacionesModule,
    InscripcionesModule,
    AsistenciaModule,
    UsuariosModule,
    ...(USA_BACKOFFICE_MOCK ? [BackofficeMockModule] : []),
    ...(USA_CORE_MOCK ? [CoreMockModule] : []),
  ],
  providers: [RecordatoriosService],
  exports: [RecordatoriosService],
})
export class AppModule {}
