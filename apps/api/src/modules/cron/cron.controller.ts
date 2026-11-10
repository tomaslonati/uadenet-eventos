import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronSecretGuard } from '../../common/guards/cron-secret.guard';
import { LocacionesSyncService } from '../locaciones/locaciones-sync.service';
import { RecordatoriosService } from '../../workers/recordatorios.service';

/**
 * Tareas periódicas para Vercel, donde la API es serverless y `setInterval` no
 * corre. Una sola invocación diaria (el plan Hobby no admite más) hace todo el
 * trabajo y espera a que termine antes de responder: pasada la respuesta,
 * Vercel congela la función.
 */
@ApiExcludeController()
@UseGuards(CronSecretGuard)
@Controller({ path: 'cron', version: '1' })
export class CronController {
  constructor(
    private readonly recordatorios: RecordatoriosService,
    private readonly locacionesSync: LocacionesSyncService,
  ) {}

  @Get('diario')
  async diario() {
    await this.locacionesSync.sincronizar();
    const recordatoriosEnviados = await this.recordatorios.ejecutar();
    return { ok: true, recordatoriosEnviados };
  }
}
