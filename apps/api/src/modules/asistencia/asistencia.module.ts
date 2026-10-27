import { Module } from '@nestjs/common';
import { AnaliticaModule } from '../../common/analitica/analitica.module';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';

@Module({
  imports: [AnaliticaModule],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
})
export class AsistenciaModule {}
