import type * as RepoDb from '@repo/db';

const seleccionar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar },
  };
});

import type { NotificacionesService } from '../common/core/notificaciones.service';
import { RecordatoriosService } from './recordatorios.service';

describe('RecordatoriosService', () => {
  let service: RecordatoriosService;
  let enviarRecordatorio: jest.Mock;

  beforeEach(() => {
    enviarRecordatorio = jest.fn().mockResolvedValue(true);
    service = new RecordatoriosService({
      enviarRecordatorio,
    } as unknown as NotificacionesService);
    seleccionar.mockReset();
  });

  it('envía un recordatorio por cada inscripción activa de eventos a 7 días', async () => {
    const fechaEvento = new Date('2026-10-22T18:00:00.000Z');
    seleccionar.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () =>
              Promise.resolve([
                {
                  usuarioId: 'u-10432',
                  eventoId: '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03',
                  titulo: 'Workshop de Testing',
                  fechaInicio: fechaEvento,
                  locacionNombre: 'Aula Magna',
                  locacionSede: 'Monserrat',
                },
              ]),
          }),
        }),
      }),
    });

    const cantidad = await service.ejecutar(
      new Date('2026-10-15T10:00:00.000Z'),
    );

    expect(cantidad).toBe(1);
    expect(enviarRecordatorio).toHaveBeenCalledWith({
      usuarioId: 'u-10432',
      eventoId: '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03',
      titulo: 'Workshop de Testing',
      fechaInicio: '2026-10-22T18:00:00.000Z',
      locacion: 'Aula Magna — Monserrat',
    });
  });
});
