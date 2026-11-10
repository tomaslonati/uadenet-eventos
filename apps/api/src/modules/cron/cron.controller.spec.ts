import type { RecordatoriosService } from '../../workers/recordatorios.service';
import type { LocacionesSyncService } from '../locaciones/locaciones-sync.service';
import { CronController } from './cron.controller';

describe('CronController', () => {
  it('sincroniza las locaciones, envía los recordatorios y espera a que terminen antes de responder', async () => {
    const orden: string[] = [];
    const sincronizar = jest.fn(async () => {
      await Promise.resolve();
      orden.push('locaciones');
    });
    const ejecutar = jest.fn(async () => {
      await Promise.resolve();
      orden.push('recordatorios');
      return 3;
    });
    const controller = new CronController(
      { ejecutar } as unknown as RecordatoriosService,
      { sincronizar } as unknown as LocacionesSyncService,
    );

    await expect(controller.diario()).resolves.toEqual({
      ok: true,
      recordatoriosEnviados: 3,
    });
    expect(orden).toEqual(['locaciones', 'recordatorios']);
  });
});
