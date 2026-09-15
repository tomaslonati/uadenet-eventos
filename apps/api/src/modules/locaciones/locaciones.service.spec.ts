import type * as RepoDb from '@repo/db';

const seleccionar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar },
  };
});

import { LocacionesService } from './locaciones.service';

describe('LocacionesService', () => {
  let service: LocacionesService;

  beforeEach(() => {
    service = new LocacionesService();
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
});
