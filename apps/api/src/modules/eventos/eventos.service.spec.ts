import { ConflictException } from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { CrearEvento } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, insert: insertar },
  };
});

import { EventosService } from './eventos.service';

describe('EventosService', () => {
  let service: EventosService;

  const datos: CrearEvento = {
    titulo: 'Workshop de Testing',
    descripcion: 'Descripción',
    locacionId: 'l1',
    cupoMaximo: 50,
    fechaInicio: new Date('2026-09-12T10:00:00Z'),
    fechaFin: new Date('2026-09-12T12:00:00Z'),
    esPago: false,
  };

  beforeEach(() => {
    service = new EventosService();
    seleccionar.mockReset();
    insertar.mockReset();
  });

  it('crea el evento cuando no hay conflicto de locación', async () => {
    seleccionar.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    });
    const eventoCreado = {
      id: 'e1',
      ...datos,
      precio: null,
      creadoPor: 'seed-admin-demo',
    };
    insertar.mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([eventoCreado]) }),
    });

    await expect(service.crear(datos)).resolves.toEqual(eventoCreado);
  });

  it('rechaza con ConflictException si la locación ya tiene un evento superpuesto', async () => {
    seleccionar.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 'otro-evento' }]),
        }),
      }),
    });

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });
});
