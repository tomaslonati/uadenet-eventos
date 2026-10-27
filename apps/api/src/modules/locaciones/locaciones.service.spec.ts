import type * as RepoDb from '@repo/db';

const seleccionar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar },
  };
});

import type { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { LocacionesService } from './locaciones.service';

describe('LocacionesService', () => {
  let listarSedesMock: jest.Mock;
  let service: LocacionesService;

  beforeEach(() => {
    listarSedesMock = jest.fn().mockResolvedValue([
      { id: 's1', nombre: 'Sede Centro' },
      { id: 's2', nombre: 'Sede Norte' },
    ]);
    service = new LocacionesService({
      listarSedes: listarSedesMock,
    } as unknown as BackofficeClient);
    seleccionar.mockReset();
  });

  it('lista las locaciones ordenadas por nombre', async () => {
    const filas = [
      { id: 'l1', nombre: 'Aula Magna', sede: 'Centro', capacidad: 100 },
      { id: 'l2', nombre: 'Salón de Actos', sede: 'Norte', capacidad: 120 },
    ];
    seleccionar.mockReturnValue({
      from: () => ({ orderBy: () => Promise.resolve(filas) }),
    });

    await expect(service.listar()).resolves.toEqual(filas);
  });

  it('lista las sedes consumiendo BackofficeClient', async () => {
    const sedes = await service.listarSedes();
    expect(sedes).toHaveLength(2);
    expect(listarSedesMock).toHaveBeenCalledTimes(1);
  });
});
