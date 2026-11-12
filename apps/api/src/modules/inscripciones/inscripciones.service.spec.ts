import { ConflictException, NotFoundException } from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { EventoDeCartelera, Inscripcion } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();
const borrar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, insert: insertar, delete: borrar },
  };
});

import type { AnaliticaService } from '../../common/analitica/analitica.service';
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

/** `.from(asistencias).where(...).limit(1)` */
const asistencias = (filas: { id: string }[]) => ({
  from: () => ({ where: () => ({ limit: () => Promise.resolve(filas) }) }),
});

describe('InscripcionesService', () => {
  const eventoGratuito: EventoDeCartelera = {
    id: '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03',
    titulo: 'Charla abierta',
    descripcion: 'Descripción',
    locacionId: 'c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47',
    cupoMaximo: 2,
    fechaInicio: new Date('2028-10-15T18:00:00Z'),
    fechaFin: new Date('2028-10-15T20:00:00Z'),
    esPago: false,
    categoriaPrecio: null,
    creadoPor: 'seed-admin-demo',
    estado: 'publicado',
    motivoCancelacion: null,
    reprogramadoEn: null,
    locacion: { nombre: 'Aula Magna', sede: 'Monserrat' },
    inscriptos: 0,
    disponibles: 2,
    yaInscripto: false,
    precio: null,
  };

  const eventoPago: EventoDeCartelera = {
    ...eventoGratuito,
    esPago: true,
    categoriaPrecio: 'especial',
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
  let conciliarPorReferencia: jest.Mock;
  let revertir: jest.Mock;
  let obtener: jest.Mock;
  let inscripcionRegistrada: jest.Mock;
  let service: InscripcionesService;

  const construir = (evento: EventoDeCartelera) => {
    obtener = jest.fn().mockResolvedValue(evento);
    descontar = jest.fn().mockResolvedValue({
      aprobado: true,
      saldoRestante: 5500,
      motivo: null,
    });
    conciliarPorReferencia = jest.fn().mockResolvedValue({
      transactionId: 'tx-cobro',
      status: 'POSTED',
    });
    revertir = jest.fn().mockResolvedValue({ transactionId: 'tx-reversa' });
    inscripcionRegistrada = jest.fn();
    service = new InscripcionesService(
      { obtener } as unknown as EventosService,
      {
        descontar,
        conciliarPorReferencia,
        revertir,
      } as unknown as SaldoService,
      { inscripcionRegistrada } as unknown as AnaliticaService,
    );
  };

  beforeEach(() => {
    seleccionar.mockReset();
    insertar.mockReset();
    borrar.mockReset();
    borrar.mockReturnValue({ where: () => Promise.resolve() });
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

  it('emite inscripcion.registrada hacia Analítica una vez persistida', async () => {
    seleccionar.mockReturnValueOnce(superpuestas([]));
    insertar.mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([inscripcionCreada]) }),
    });

    await service.crear(datos);

    expect(inscripcionRegistrada).toHaveBeenCalledWith({
      inscripcionId: inscripcionCreada.id,
      eventoId: inscripcionCreada.eventoId,
      usuarioId: 'seed-admin-demo',
      rol: 'administrativo',
      pagoConfirmado: false,
    });
  });

  it('rechaza una inscripción paga cuando no hay tarifa vigente', async () => {
    construir({ ...eventoPago, precio: null });
    seleccionar.mockReturnValueOnce(superpuestas([]));

    await expect(service.crear(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(descontar).not.toHaveBeenCalled();
    expect(insertar).not.toHaveBeenCalled();
    expect(inscripcionRegistrada).not.toHaveBeenCalled();
  });

  it('rechaza inscribirse a un evento cancelado', async () => {
    construir({ ...eventoGratuito, estado: 'cancelado' });

    await expect(service.crear(datos)).rejects.toThrow('fue cancelado');
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza inscribirse a un evento que ya finalizó', async () => {
    construir({
      ...eventoGratuito,
      fechaFin: new Date(Date.now() - 60_000),
    });

    await expect(service.crear(datos)).rejects.toThrow('ya finalizó');
    expect(insertar).not.toHaveBeenCalled();
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

  it('descuenta el saldo y congela el monto cobrado cuando el evento es pago', async () => {
    construir(eventoPago);
    seleccionar.mockReturnValueOnce(superpuestas([]));
    const values = jest.fn().mockReturnValue({
      returning: () =>
        Promise.resolve([{ ...inscripcionCreada, pagoConfirmado: true }]),
    });
    insertar.mockReturnValue({ values });

    await service.crear(datos);

    expect(descontar).toHaveBeenCalledWith(
      expect.objectContaining({ monto: 4500, usuarioId: 'seed-admin-demo' }),
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ montoCobrado: 4500 }),
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
    expect(inscripcionRegistrada).not.toHaveBeenCalled();
  });

  describe('cancelar', () => {
    const ahora = new Date('2026-10-10T12:00:00Z');
    const usuario = 'seed-admin-demo';

    const inscripcionEncontrada = (
      sobreescribir: Partial<{
        estado: 'inscripto' | 'cancelada';
        pagoConfirmado: boolean;
        montoCobrado: number | null;
        fechaInicio: Date;
        reprogramadoEn: Date | null;
      }> = {},
    ) =>
      superpuestas([
        {
          id: inscripcionCreada.id,
          estado: 'inscripto',
          pagoConfirmado: false,
          montoCobrado: null,
          titulo: 'Charla abierta',
          fechaInicio: eventoGratuito.fechaInicio,
          reprogramadoEn: null,
          ...sobreescribir,
        } as { id: string },
      ]);

    it('cancela una inscripción gratuita sin tocar el saldo', async () => {
      seleccionar
        .mockReturnValueOnce(inscripcionEncontrada())
        .mockReturnValueOnce(asistencias([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).resolves.toEqual({
        inscripcionId: inscripcionCreada.id,
        montoReembolsado: null,
      });
      expect(revertir).not.toHaveBeenCalled();
      expect(borrar).toHaveBeenCalledTimes(1);
    });

    it('devuelve el monto cobrado revirtiendo el débito en CORE', async () => {
      seleccionar
        .mockReturnValueOnce(
          inscripcionEncontrada({ pagoConfirmado: true, montoCobrado: 4500 }),
        )
        .mockReturnValueOnce(asistencias([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).resolves.toEqual({
        inscripcionId: inscripcionCreada.id,
        montoReembolsado: 4500,
      });
      expect(conciliarPorReferencia).toHaveBeenCalledWith(inscripcionCreada.id);
      expect(revertir).toHaveBeenCalledWith(
        'tx-cobro',
        expect.stringContaining('Charla abierta'),
        4500,
      );
      expect(borrar).toHaveBeenCalledTimes(1);
    });

    it('no vuelve a revertir un cobro que ya estaba revertido', async () => {
      conciliarPorReferencia.mockResolvedValue({
        transactionId: 'tx-cobro',
        status: 'REVERSED',
      });
      seleccionar
        .mockReturnValueOnce(
          inscripcionEncontrada({ pagoConfirmado: true, montoCobrado: 4500 }),
        )
        .mockReturnValueOnce(asistencias([]));

      await service.cancelar(inscripcionCreada.id, usuario, ahora);

      expect(revertir).not.toHaveBeenCalled();
      expect(borrar).toHaveBeenCalledTimes(1);
    });

    it('rechaza a menos de 24 horas del inicio, sin devolver ni borrar nada', async () => {
      seleccionar.mockReturnValueOnce(
        inscripcionEncontrada({
          pagoConfirmado: true,
          montoCobrado: 4500,
          fechaInicio: new Date('2026-10-11T11:59:00Z'),
        }),
      );

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(revertir).not.toHaveBeenCalled();
      expect(borrar).not.toHaveBeenCalled();
    });

    it('si el evento se reprogramó, deja cancelar a menos de 24 horas y devuelve el pago', async () => {
      seleccionar
        .mockReturnValueOnce(
          inscripcionEncontrada({
            pagoConfirmado: true,
            montoCobrado: 4500,
            fechaInicio: new Date('2026-10-10T18:00:00Z'),
            reprogramadoEn: new Date('2026-10-09T10:00:00Z'),
          }),
        )
        .mockReturnValueOnce(asistencias([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).resolves.toEqual({
        inscripcionId: inscripcionCreada.id,
        montoReembolsado: 4500,
      });
      expect(revertir).toHaveBeenCalledTimes(1);
    });

    it('aun reprogramado, no deja cancelar una vez que el evento empezó', async () => {
      seleccionar.mockReturnValueOnce(
        inscripcionEncontrada({
          fechaInicio: new Date('2026-10-10T11:00:00Z'),
          reprogramadoEn: new Date('2026-10-09T10:00:00Z'),
        }),
      );

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(borrar).not.toHaveBeenCalled();
    });

    it('rechaza cancelar una inscripción que ya cayó con la cancelación del evento', async () => {
      seleccionar.mockReturnValueOnce(
        inscripcionEncontrada({ estado: 'cancelada' }),
      );

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toThrow('ya fue cancelada junto con el evento');
      expect(revertir).not.toHaveBeenCalled();
      expect(borrar).not.toHaveBeenCalled();
    });

    it('acepta cancelar justo 24 horas antes', async () => {
      seleccionar
        .mockReturnValueOnce(
          inscripcionEncontrada({
            fechaInicio: new Date('2026-10-11T12:00:00Z'),
          }),
        )
        .mockReturnValueOnce(asistencias([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).resolves.toBeDefined();
    });

    it('rechaza si la asistencia ya fue registrada', async () => {
      seleccionar
        .mockReturnValueOnce(inscripcionEncontrada())
        .mockReturnValueOnce(asistencias([{ id: 'asistencia-1' }]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(borrar).not.toHaveBeenCalled();
    });

    it('mantiene la inscripción si CORE no pudo devolver el saldo', async () => {
      revertir.mockResolvedValue(null);
      seleccionar
        .mockReturnValueOnce(
          inscripcionEncontrada({ pagoConfirmado: true, montoCobrado: 4500 }),
        )
        .mockReturnValueOnce(asistencias([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(borrar).not.toHaveBeenCalled();
    });

    it('responde 404 si la inscripción no existe o es de otra persona', async () => {
      seleccionar.mockReturnValueOnce(superpuestas([]));

      await expect(
        service.cancelar(inscripcionCreada.id, usuario, ahora),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
