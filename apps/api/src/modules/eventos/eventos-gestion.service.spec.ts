import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type * as RepoDb from '@repo/db';

const seleccionar = jest.fn();
const actualizar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, update: actualizar },
  };
});

import type { AnaliticaService } from '../../common/analitica/analitica.service';
import type { TarifasService } from '../../common/backoffice/tarifas.service';
import type { NotificacionesService } from '../../common/core/notificaciones.service';
import type { SaldoService } from '../../common/core/saldo.service';
import { EventosGestionService } from './eventos-gestion.service';

/** Cualquier cadena de drizzle (`.from().where().limit()...`) que, al esperarla, devuelve `filas`. */
function cadena(filas: unknown): unknown {
  const proxy: unknown = new Proxy(() => undefined, {
    get: (_destino, propiedad) =>
      propiedad === 'then'
        ? (ok: (v: unknown) => unknown, error: (e: unknown) => unknown) =>
            Promise.resolve(filas).then(ok, error)
        : () => proxy,
  });
  return proxy;
}

const AHORA = new Date('2026-10-01T12:00:00Z');
const INICIO = new Date('2026-10-20T18:00:00Z');
const FIN = new Date('2026-10-20T20:00:00Z');

const evento = {
  id: 'e1',
  titulo: 'Jornada de IA',
  descripcion: 'Descripción',
  locacionId: 'l1',
  cupoMaximo: 50,
  fechaInicio: INICIO,
  fechaFin: FIN,
  esPago: false,
  categoriaPrecio: null,
  creadoPor: 'admin-1',
  estado: 'publicado',
  motivoCancelacion: null,
  canceladoEn: null,
  reprogramadoEn: null,
};

const locacion = { nombre: 'Aula Magna', sede: 'Monserrat', aptoEventos: true };

describe('EventosGestionService', () => {
  let service: EventosGestionService;
  let valoresActualizados: Record<string, unknown>[];
  let resultadosUpdate: unknown[];

  let exigirPrecio: jest.Mock;
  let eventoModificado: jest.Mock;
  let eventoCancelado: jest.Mock;
  let enviarAviso: jest.Mock;
  let conciliarPorReferencia: jest.Mock;
  let revertir: jest.Mock;

  beforeEach(() => {
    exigirPrecio = jest.fn().mockReturnValue(12_500);
    eventoModificado = jest.fn();
    eventoCancelado = jest.fn();
    enviarAviso = jest.fn().mockResolvedValue(true);
    conciliarPorReferencia = jest.fn();
    revertir = jest.fn();

    service = new EventosGestionService(
      { exigirPrecio } as unknown as TarifasService,
      { eventoModificado, eventoCancelado } as unknown as AnaliticaService,
      { conciliarPorReferencia, revertir } as unknown as SaldoService,
      { enviarAviso } as unknown as NotificacionesService,
    );

    seleccionar.mockReset();
    actualizar.mockReset();
    valoresActualizados = [];
    resultadosUpdate = [];
    actualizar.mockImplementation(() => ({
      set: (valores: Record<string, unknown>) => {
        valoresActualizados.push(valores);
        return cadena(resultadosUpdate.shift() ?? []);
      },
    }));
  });

  describe('actualizar', () => {
    it('rechaza con NotFoundException si el evento no existe', async () => {
      seleccionar.mockReturnValueOnce(cadena([]));

      await expect(
        service.actualizar('e1', { titulo: 'Nuevo' }, 'admin-1', AHORA),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza con ForbiddenException si quien edita no es el creador', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.actualizar('e1', { titulo: 'Nuevo' }, 'otro-admin', AHORA),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('rechaza editar un evento cancelado', async () => {
      seleccionar.mockReturnValueOnce(
        cadena([{ ...evento, estado: 'cancelado' }]),
      );

      await expect(
        service.actualizar('e1', { titulo: 'Nuevo' }, 'admin-1', AHORA),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza editar un evento que ya comenzó', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.actualizar(
          'e1',
          { titulo: 'Nuevo' },
          'admin-1',
          new Date('2026-10-20T18:30:00Z'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza bajar el cupo por debajo de los inscriptos actuales', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 30 }]));

      await expect(
        service.actualizar('e1', { cupoMaximo: 20 }, 'admin-1', AHORA),
      ).rejects.toThrow('Ya hay 30 inscriptos');
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('rechaza cambiar si el evento es pago cuando ya hay inscriptos', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 1 }]));

      await expect(
        service.actualizar(
          'e1',
          { esPago: true, categoriaPrecio: 'general' },
          'admin-1',
          AHORA,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza un evento pago sin categoría de precio', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.actualizar('e1', { esPago: true }, 'admin-1', AHORA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza mover el inicio a una fecha que ya pasó', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.actualizar(
          'e1',
          {
            fechaInicio: new Date('2026-09-01T10:00:00Z'),
            fechaFin: new Date('2026-09-01T12:00:00Z'),
          },
          'admin-1',
          AHORA,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza reprogramar si la locación ya tiene otro evento en ese horario', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 0 }]))
        .mockReturnValueOnce(cadena([locacion]))
        .mockReturnValueOnce(cadena([{ id: 'otro' }]));

      await expect(
        service.actualizar(
          'e1',
          {
            fechaInicio: new Date('2026-10-21T18:00:00Z'),
            fechaFin: new Date('2026-10-21T20:00:00Z'),
          },
          'admin-1',
          AHORA,
        ),
      ).rejects.toThrow('La locación ya tiene un evento');
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('rechaza reprogramar si un inscripto quedaría con otro evento en el nuevo horario', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 2 }]))
        .mockReturnValueOnce(cadena([locacion]))
        .mockReturnValueOnce(cadena([]))
        .mockReturnValueOnce(cadena([{ usuarioId: 'u1' }, { usuarioId: 'u2' }]))
        .mockReturnValueOnce(cadena([{ usuarioId: 'u2' }]));

      await expect(
        service.actualizar(
          'e1',
          {
            fechaInicio: new Date('2026-10-21T18:00:00Z'),
            fechaFin: new Date('2026-10-21T20:00:00Z'),
          },
          'admin-1',
          AHORA,
        ),
      ).rejects.toThrow('1 inscripto quedaría');
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('al reprogramar guarda reprogramadoEn, avisa a cada inscripto y emite evento.modificado', async () => {
      const nuevoInicio = new Date('2026-10-21T18:00:00Z');
      const nuevoFin = new Date('2026-10-21T20:00:00Z');
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 2 }]))
        .mockReturnValueOnce(cadena([locacion]))
        .mockReturnValueOnce(cadena([]))
        .mockReturnValueOnce(cadena([{ usuarioId: 'u1' }, { usuarioId: 'u2' }]))
        .mockReturnValueOnce(cadena([]))
        .mockReturnValueOnce(
          cadena([{ usuarioId: 'u1' }, { usuarioId: 'u2' }]),
        );
      resultadosUpdate.push([
        {
          ...evento,
          fechaInicio: nuevoInicio,
          fechaFin: nuevoFin,
          reprogramadoEn: AHORA,
        },
      ]);

      const resultado = await service.actualizar(
        'e1',
        { fechaInicio: nuevoInicio, fechaFin: nuevoFin },
        'admin-1',
        AHORA,
      );

      expect(valoresActualizados[0]).toMatchObject({ reprogramadoEn: AHORA });
      expect(resultado.notificados).toBe(2);
      expect(enviarAviso).toHaveBeenCalledTimes(2);
      expect(enviarAviso).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'evento.reprogramado',
          usuarioId: 'u1',
          eventoId: 'e1',
          referencia: `evento/e1/reprogramado/${AHORA.getTime()}`,
        }),
      );
      expect(eventoModificado).toHaveBeenCalledWith(
        expect.objectContaining({
          eventoId: 'e1',
          reprogramado: true,
          inscriptosNotificados: 2,
        }),
      );
    });

    it('un cambio de título o descripción no reprograma ni avisa a nadie', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 2 }]))
        .mockReturnValueOnce(cadena([locacion]));
      resultadosUpdate.push([{ ...evento, titulo: 'Nuevo título' }]);

      const resultado = await service.actualizar(
        'e1',
        { titulo: 'Nuevo título' },
        'admin-1',
        AHORA,
      );

      expect(valoresActualizados[0]).not.toHaveProperty('reprogramadoEn');
      expect(resultado.notificados).toBe(0);
      expect(enviarAviso).not.toHaveBeenCalled();
      expect(eventoModificado).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    const inscripcionGratis = {
      id: 'i1',
      usuarioId: 'u1',
      estado: 'inscripto',
      pagoConfirmado: false,
      montoCobrado: null,
    };
    const inscripcionPaga = {
      id: 'i2',
      usuarioId: 'u2',
      estado: 'inscripto',
      pagoConfirmado: true,
      montoCobrado: 5_500,
    };
    const resumen = (extra: Partial<Record<string, number>> = {}) => ({
      inscriptosAfectados: 2,
      reembolsados: 1,
      reembolsosPendientes: 0,
      montoReembolsado: 5_500,
      ...extra,
    });

    it('rechaza si quien cancela no es el creador', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.cancelar('e1', 'Lluvia', 'otro-admin', AHORA),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza cancelar un evento que ya comenzó', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(
        service.cancelar(
          'e1',
          'Lluvia',
          'admin-1',
          new Date('2026-10-20T19:00:00Z'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('rechaza cancelar si ya hay asistencias registradas', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 1 }]));

      await expect(
        service.cancelar('e1', 'Lluvia', 'admin-1', AHORA),
      ).rejects.toThrow('asistencias registradas');
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('cancela el evento, devuelve cada pago, avisa a todos y emite evento.cancelado', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 0 }]))
        .mockReturnValueOnce(cadena([inscripcionGratis, inscripcionPaga]))
        .mockReturnValueOnce(cadena([resumen()]));
      resultadosUpdate.push([{ id: 'e1' }]);
      conciliarPorReferencia.mockResolvedValue({
        transactionId: 'tx-1',
        status: 'POSTED',
      });
      revertir.mockResolvedValue({ transactionId: 'tx-rev' });

      const resultado = await service.cancelar(
        'e1',
        'Lluvia',
        'admin-1',
        AHORA,
      );

      expect(valoresActualizados[0]).toMatchObject({
        estado: 'cancelado',
        motivoCancelacion: 'Lluvia',
        canceladoEn: AHORA,
      });
      expect(conciliarPorReferencia).toHaveBeenCalledWith('i2');
      expect(revertir).toHaveBeenCalledTimes(1);
      expect(revertir).toHaveBeenCalledWith('tx-1', expect.any(String), 5_500);
      expect(valoresActualizados).toContainEqual({
        estado: 'cancelada',
        reembolsadoEn: AHORA,
      });
      expect(enviarAviso).toHaveBeenCalledTimes(2);
      expect(enviarAviso).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'evento.cancelado',
          usuarioId: 'u2',
          referencia: 'evento/e1/cancelado',
          mensaje: expect.stringContaining('Te devolvimos $5.500') as string,
        }),
      );
      expect(eventoCancelado).toHaveBeenCalledWith({
        eventoId: 'e1',
        motivo: 'Lluvia',
        inscriptosAfectados: 2,
        montoReembolsado: 5_500,
      });
      expect(resultado).toEqual({
        eventoId: 'e1',
        ...resumen(),
        notificados: 2,
      });
    });

    it('si CORE no confirma la reversa, la inscripción queda cancelada con el reembolso pendiente', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 0 }]))
        .mockReturnValueOnce(cadena([inscripcionPaga]))
        .mockReturnValueOnce(
          cadena([
            resumen({
              inscriptosAfectados: 1,
              reembolsados: 0,
              reembolsosPendientes: 1,
              montoReembolsado: 0,
            }),
          ]),
        );
      resultadosUpdate.push([{ id: 'e1' }]);
      conciliarPorReferencia.mockResolvedValue({
        transactionId: 'tx-1',
        status: 'POSTED',
      });
      revertir.mockResolvedValue(null);

      const resultado = await service.cancelar(
        'e1',
        'Lluvia',
        'admin-1',
        AHORA,
      );

      expect(valoresActualizados).toContainEqual({ estado: 'cancelada' });
      expect(valoresActualizados).not.toContainEqual(
        expect.objectContaining({ reembolsadoEn: AHORA }),
      );
      expect(enviarAviso).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining(
            'procesando la devolución',
          ) as string,
        }),
      );
      expect(resultado.reembolsosPendientes).toBe(1);
    });

    it('si el cobro ya figura revertido en CORE no vuelve a devolver el dinero', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 0 }]))
        .mockReturnValueOnce(cadena([inscripcionPaga]))
        .mockReturnValueOnce(cadena([resumen()]));
      resultadosUpdate.push([{ id: 'e1' }]);
      conciliarPorReferencia.mockResolvedValue({
        transactionId: 'tx-1',
        status: 'REVERSED',
      });

      await service.cancelar('e1', 'Lluvia', 'admin-1', AHORA);

      expect(revertir).not.toHaveBeenCalled();
      expect(valoresActualizados).toContainEqual({
        estado: 'cancelada',
        reembolsadoEn: AHORA,
      });
    });

    it('repetir la cancelación solo reintenta los reembolsos pendientes, sin reavisar ni reemitir', async () => {
      const pendiente = { ...inscripcionPaga, estado: 'cancelada' };
      seleccionar
        .mockReturnValueOnce(cadena([{ ...evento, estado: 'cancelado' }]))
        .mockReturnValueOnce(cadena([pendiente]))
        .mockReturnValueOnce(cadena([resumen()]));
      conciliarPorReferencia.mockResolvedValue({
        transactionId: 'tx-1',
        status: 'POSTED',
      });
      revertir.mockResolvedValue({ transactionId: 'tx-rev' });

      await service.cancelar(
        'e1',
        'Lluvia',
        'admin-1',
        new Date('2026-10-21T00:00:00Z'),
      );

      expect(revertir).toHaveBeenCalledTimes(1);
      expect(enviarAviso).not.toHaveBeenCalled();
      expect(eventoCancelado).not.toHaveBeenCalled();
      expect(valoresActualizados).not.toContainEqual(
        expect.objectContaining({ estado: 'cancelado' }),
      );
    });

    it('si otra request ya canceló el evento, no reemite evento.cancelado', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(cadena([{ total: 0 }]))
        .mockReturnValueOnce(cadena([]))
        .mockReturnValueOnce(cadena([resumen()]));
      resultadosUpdate.push([]);

      await service.cancelar('e1', 'Lluvia', 'admin-1', AHORA);

      expect(eventoCancelado).not.toHaveBeenCalled();
    });
  });

  describe('impacto', () => {
    it('resume lo que mueve cancelar: inscriptos, monto a reembolsar y asistencias', async () => {
      seleccionar
        .mockReturnValueOnce(cadena([evento]))
        .mockReturnValueOnce(
          cadena([
            {
              inscriptos: '12',
              inscriptosPagos: '10',
              montoAReembolsar: '55000',
              reembolsosPendientes: '0',
            },
          ]),
        )
        .mockReturnValueOnce(cadena([{ total: '0' }]));

      await expect(service.impacto('e1', 'admin-1')).resolves.toEqual({
        eventoId: 'e1',
        inscriptos: 12,
        inscriptosPagos: 10,
        montoAReembolsar: 55_000,
        reembolsosPendientes: 0,
        asistenciasRegistradas: 0,
      });
    });

    it('solo se consulta como creador', async () => {
      seleccionar.mockReturnValueOnce(cadena([evento]));

      await expect(service.impacto('e1', 'otro-admin')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
