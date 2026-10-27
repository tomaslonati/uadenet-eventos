import { Global, Module } from '@nestjs/common';
import { CoreJwtGuard } from '../guards/core-jwt.guard';
import { CoreJwksService } from './core-jwks.service';
import { CoreTokenService } from './core-token.service';
import { NotificacionesService } from './notificaciones.service';
import { SaldoService } from './saldo.service';

@Global()
@Module({
  providers: [
    CoreTokenService,
    CoreJwksService,
    SaldoService,
    NotificacionesService,
    CoreJwtGuard,
  ],
  exports: [
    CoreTokenService,
    CoreJwksService,
    SaldoService,
    NotificacionesService,
    CoreJwtGuard,
  ],
})
export class CoreModule {}
