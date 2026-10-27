import type * as RepoDb from '@repo/db';
import type { EspacioBackoffice } from '@repo/contracts';

const insertar = jest.fn();
const actualizar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { insert: insertar, update: actualizar },
  };
});

import type { BackofficeClient } from '../../common/backoffice/backoffice.client';
import { LocacionesSyncService } from './locaciones-sync.service';

const CENTRO = 'a1b2c3d4-0001-4a00-8000-000000000001';
const NORTE = 'a1b2c3d4-0002-4a00-8000-000000000002';

const espacio = (
  id: string,
  sedeId: string,
  cambios: Partial<EspacioBackoffice> = {},
): EspacioBackoffice => ({
  id,
  sedeId,
  codigo: 'X-1',
  nombre: `Espacio ${id}`,
  tipo: 'SALA_EVENTOS',
  capacidad: 100,
  aptoEventos: true,
  estado: 'ACTIVO',
  ...cambios,
});

describe('LocacionesSyncService', () => {
  let listarSedes: jest.Mock;
  let listarEspacios: jest.Mock;
  let values: jest.Mock;
  let where: jest.Mock;
  let service: LocacionesSyncService;

  beforeEach(() => {
    listarSedes = jest.fn().mockResolvedValue([
      { id: CENTRO, nombre: 'Sede Centro' },
      { id: NORTE, nombre: 'Sede Norte' },
    ]);
    listarEspacios = jest.fn((sedeId: string) =>
      Promise.resolve(
        sedeId === CENTRO
          ? [espacio('e1', CENTRO, { capacidad: 300 })]
          : [espacio('e2', NORTE)],
      ),
    );
    values = jest.fn().mockReturnValue({
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
    });
    where = jest.fn().mockResolvedValue(undefined);
    insertar.mockReset().mockReturnValue({ values });
    actualizar.mockReset().mockReturnValue({ set: () => ({ where }) });

    service = new LocacionesSyncService({
      listarSedes,
      listarEspacios,
    } as unknown as BackofficeClient);
  });

  it('pide los espacios aptos para eventos de cada sede', async () => {
    await service.sincronizar();

    expect(listarEspacios).toHaveBeenCalledWith(CENTRO, { aptoEventos: true });
    expect(listarEspacios).toHaveBeenCalledWith(NORTE, { aptoEventos: true });
  });

  it('guarda cada espacio como locación con el nombre de su sede', async () => {
    await service.sincronizar();

    expect(values).toHaveBeenCalledWith([
      {
        id: 'e1',
        nombre: 'Espacio e1',
        sede: 'Sede Centro',
        capacidad: 300,
        aptoEventos: true,
      },
      {
        id: 'e2',
        nombre: 'Espacio e2',
        sede: 'Sede Norte',
        capacidad: 100,
        aptoEventos: true,
      },
    ]);
    expect(where).toHaveBeenCalledTimes(1);
  });

  it('descarta espacios inactivos, no aptos o de una sede desconocida', async () => {
    listarEspacios.mockImplementation((sedeId: string) =>
      Promise.resolve(
        sedeId === CENTRO
          ? [
              espacio('ok', CENTRO),
              espacio('inactivo', CENTRO, { estado: 'INACTIVO' }),
              espacio('no-apto', CENTRO, { aptoEventos: false }),
              espacio('huerfano', 'a1b2c3d4-0099-4a00-8000-000000000099'),
            ]
          : [],
      ),
    );

    await service.sincronizar();

    const llamadas = values.mock.calls as unknown[][];
    const guardados = (llamadas[0]?.[0] ?? []) as { id: string }[];
    expect(guardados.map((fila) => fila.id)).toEqual(['ok']);
  });

  it('no toca la copia local si Backoffice falla', async () => {
    listarEspacios.mockRejectedValue(new Error('timeout'));

    await expect(service.sincronizar()).resolves.toBeUndefined();
    expect(insertar).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('no deshabilita nada si Backoffice no devuelve espacios', async () => {
    listarEspacios.mockResolvedValue([]);

    await service.sincronizar();

    expect(insertar).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
  });
});
