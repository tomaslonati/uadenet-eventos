import { ConflictException } from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { EventoDeCartelera, Inscripcion } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, insert: insertar },
  };
});

import type { SaldoService } from '../../common/core/saldo.service';
import type { EventosService } from '../eventos/eventos.service';
import { InscripcionesService } from './inscripciones.service';

/** `.from(inscripciones).innerJoin(eventos).where(...).limit(1)` */
const superpuestas = (filas: { id: string }[]) => ({
  from: () => ({
    innerJoin: () => ({
      where: () => ({ limit: () => Promise.resolve(filas) }),
    }),
  }),
});

describe('InscripcionesService', () => {
  const eventoGratuito: EventoDeCartelera = {
    id: '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03',
    titulo: 'Charla abierta',
    descripcion: 'Descripción',
    locacionId: 'c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47',
    cupoMaximo: 2,
    fechaInicio: new Date('2026-10-15T18:00:00Z'),
    fechaFin: new Date('2026-10-15T20:00:00Z'),
    esPago: false,
    precio: null,
    creadoPor: 'seed-admin-demo',
    locacion: { nombre: 'Aula Magna', sede: 'Monserrat' },
    inscriptos: 0,
    disponibles: 2,
    yaInscripto: false,
  };

  const eventoPago: EventoDeCartelera = {
    ...eventoGratuito,
    esPago: true,
    precio: 4500,
  };

  const inscripcionCreada = {
    id: '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68',
    eventoId: eventoGratuito.id,
    usuarioId: 'seed-admin-demo',
    fechaInscripcion: new Date('2026-09-30T14:22:10Z'),
    estado: 'inscripto',
    pagoConfirmado: false,
  } as Inscripcion;

  const datos = { eventoId: eventoGratuito.id };

  let descontar: jest.Mock;
  let obtener: jest.Mock;
  let service: InscripcionesService;

  const construir = (evento: EventoDeCartelera) => {
    obtener = jest.fn().mockResolvedValue(evento);
    descontar = jest.fn().mockResolvedValue({
      aprobado: true,
      saldoRestante: 5500,
      motivo: null,
    });
    service = new InscripcionesService(
      { obtener } as unknown as EventosService,
      { descontar } as unknown as SaldoService,
    );
  };

  beforeEach(() => {
    seleccionar.mockReset();
    insertar.mockReset();
    construir(eventoGratuito);
  });

  it('inscribe a un evento gratuito con cupo y sin conflicto de horario', async () => {
    seleccionar.mockReturnValueOnce(superpuestas([]));
    insertar.mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([inscripcionCreada]) }),
    });

    await expect(service.crear(datos)).resolves.toEqual(inscripcionCreada);
    expect(descontar).not.toHaveBeenCalled();
  });

  it('rechaza cuando el evento ya llegó al cupo máximo', async () => {
    construir({ ...eventoGratuito, inscriptos: 2, disponibles: 0 });

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza cuando el usuario ya tiene una inscripción superpuesta', async () => {
    seleccionar.mockReturnValueOnce(superpuestas([{ id: 'otra-inscripcion' }]));

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('descuenta el saldo antes de persistir cuando el evento es pago', async () => {
    construir(eventoPago);
    seleccionar.mockReturnValueOnce(superpuestas([]));
    insertar.mockReturnValue({
      values: () => ({
        returning: () =>
          Promise.resolve([{ ...inscripcionCreada, pagoConfirmado: true }]),
      }),
    });

    await service.crear(datos);

    expect(descontar).toHaveBeenCalledWith(
      expect.objectContaining({ monto: 4500, usuarioId: 'seed-admin-demo' }),
    );
  });

  it('rechaza y no persiste cuando el saldo es insuficiente', async () => {
    construir(eventoPago);
    descontar.mockResolvedValue({
      aprobado: false,
      saldoRestante: 1200,
      motivo: 'SALDO_INSUFICIENTE',
    });
    seleccionar.mockReturnValueOnce(superpuestas([]));

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });
});
