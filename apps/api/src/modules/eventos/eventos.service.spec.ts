import { ConflictException, NotFoundException } from '@nestjs/common';
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

import type { TarifasService } from '../../common/backoffice/tarifas.service';
import { EventosService } from './eventos.service';

/** `.from(locaciones).where(...).limit(1)` — existencia + aptoEventos en crear() */
const filaLocacion = (filas: { id: string; aptoEventos: boolean }[]) => ({
  from: () => ({ where: () => ({ limit: () => Promise.resolve(filas) }) }),
});

/** `.from(eventos).where(...).limit(1)` — chequeo de solapamiento en crear() */
const solapamiento = (filas: { id: string }[]) => ({
  from: () => ({ where: () => ({ limit: () => Promise.resolve(filas) }) }),
});

/** `.from(eventos).innerJoin(...).where(...).orderBy(...)` — listar() */
const listado = (filas: unknown[]) => ({
  from: () => ({
    innerJoin: () => ({
      where: () => ({ orderBy: () => Promise.resolve(filas) }),
    }),
  }),
});

/** `.from(eventos).innerJoin(...).where(...).limit(1)` — obtener() */
const porId = (filas: unknown[]) => ({
  from: () => ({
    innerJoin: () => ({
      where: () => ({ limit: () => Promise.resolve(filas) }),
    }),
  }),
});

/** `.from(inscripciones).where(...).groupBy(...)` — conteo por evento */
const conteos = (filas: { eventoId: string; total: number }[]) => ({
  from: () => ({ where: () => ({ groupBy: () => Promise.resolve(filas) }) }),
});

/** `.from(inscripciones).where(...)` — inscripciones del usuario del JWT */
const propias = (filas: { eventoId: string }[]) => ({
  from: () => ({ where: () => Promise.resolve(filas) }),
});

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

  const evento = {
    id: 'e1',
    ...datos,
    categoriaPrecio: null,
    creadoPor: 'seed-admin-demo',
  };

  const locacion = { nombre: 'Aula Magna', sede: 'Monserrat' };
  const fila = { evento, locacion };

  let consultarTarifa: jest.Mock;

  beforeEach(() => {
    consultarTarifa = jest.fn().mockResolvedValue(12_500);
    service = new EventosService({
      consultar: consultarTarifa,
    } as unknown as TarifasService);
    seleccionar.mockReset();
    insertar.mockReset();
  });

  it('crea el evento cuando la locación es apta y no hay conflicto de horario', async () => {
    seleccionar
      .mockReturnValueOnce(filaLocacion([{ id: 'l1', aptoEventos: true }]))
      .mockReturnValueOnce(solapamiento([]));
    const eventoCreado = { ...evento };
    insertar.mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([eventoCreado]) }),
    });

    await expect(service.crear(datos)).resolves.toEqual(eventoCreado);
  });

  it('rechaza con NotFoundException si la locación no existe', async () => {
    seleccionar.mockReturnValueOnce(filaLocacion([]));

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza con ConflictException si la locación no está habilitada para eventos', async () => {
    seleccionar.mockReturnValueOnce(
      filaLocacion([{ id: 'l1', aptoEventos: false }]),
    );

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza con ConflictException si la locación ya tiene un evento superpuesto', async () => {
    seleccionar
      .mockReturnValueOnce(filaLocacion([{ id: 'l1', aptoEventos: true }]))
      .mockReturnValueOnce(solapamiento([{ id: 'otro-evento' }]));

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('lista los eventos con locación resuelta, cupo y si ya está inscripto', async () => {
    seleccionar
      .mockReturnValueOnce(listado([fila]))
      .mockReturnValueOnce(conteos([{ eventoId: 'e1', total: 12 }]))
      .mockReturnValueOnce(propias([{ eventoId: 'e1' }]));

    await expect(service.listar({})).resolves.toEqual([
      {
        ...evento,
        locacion,
        inscriptos: 12,
        disponibles: 38,
        yaInscripto: true,
        precio: null,
      },
    ]);
    expect(consultarTarifa).not.toHaveBeenCalled();
  });

  it('resuelve el precio contra la tarifa vigente cuando el evento es pago', async () => {
    const eventoPago = { ...evento, esPago: true, categoriaPrecio: 'especial' };
    seleccionar
      .mockReturnValueOnce(listado([{ evento: eventoPago, locacion }]))
      .mockReturnValueOnce(conteos([]))
      .mockReturnValueOnce(propias([]));

    const [resultado] = await service.listar({});

    expect(consultarTarifa).toHaveBeenCalledWith('especial');
    expect(resultado).toMatchObject({ precio: 12_500 });
  });

  it('marca yaInscripto en false y cupo completo cuando no hay inscripciones', async () => {
    seleccionar
      .mockReturnValueOnce(listado([fila]))
      .mockReturnValueOnce(conteos([]))
      .mockReturnValueOnce(propias([]));

    const [resultado] = await service.listar({});

    expect(resultado).toMatchObject({
      inscriptos: 0,
      disponibles: 50,
      yaInscripto: false,
    });
  });

  it('no consulta inscripciones si no hay eventos en el rango', async () => {
    seleccionar.mockReturnValueOnce(listado([]));

    await expect(service.listar({})).resolves.toEqual([]);
    expect(seleccionar).toHaveBeenCalledTimes(1);
  });

  it('lanza NotFoundException si el evento no existe', async () => {
    seleccionar.mockReturnValueOnce(porId([]));

    await expect(service.obtener('e1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('calcula el cupo disponible restando los inscriptos', async () => {
    seleccionar
      .mockReturnValueOnce(porId([fila]))
      .mockReturnValueOnce(conteos([{ eventoId: 'e1', total: 12 }]))
      .mockReturnValueOnce(propias([]));

    await expect(service.cupo('e1')).resolves.toEqual({
      eventoId: 'e1',
      cupoMaximo: 50,
      inscriptos: 12,
      disponibles: 38,
    });
  });
});
