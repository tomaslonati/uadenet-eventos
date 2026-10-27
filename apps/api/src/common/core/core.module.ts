import { Module } from '@nestjs/common';
import { CoreTokenService } from './core-token.service';
import { SaldoService } from './saldo.service';

@Module({
  providers: [SaldoService, CoreTokenService],
  exports: [SaldoService, CoreTokenService],
})
export class CoreModule {}
