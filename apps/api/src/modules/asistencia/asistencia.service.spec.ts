import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { RegistrarAsistencia } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();
const eliminar = jest.fn();

// Mock del cliente drizzle @repo/db
jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: {
      select: seleccionar,
      insert: insertar,
      delete: eliminar,
    },
    eq: jest.fn(),
  };
});

import type { AnaliticaService } from '../../common/analitica/analitica.service';
import { AsistenciaService } from './asistencia.service';

interface ChainMock {
  innerJoin: () => ChainMock;
  leftJoin: () => ChainMock;
  where: () => ChainMock;
  orderBy: () => Promise<unknown[]>;
  limit: () => Promise<unknown[]>;
}

/** Mock encadenable para Drizzle: select().from().innerJoin().leftJoin().where().orderBy()/limit() */
const queryMock = (resultado: unknown[]) => {
  const chain: ChainMock = {
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => Promise.resolve(resultado),
    limit: () => Promise.resolve(resultado),
  };
  return {
    from: () => chain,
  };
};

describe('AsistenciaService', () => {
  const creadorId = 'seed-admin-demo';
  const otroAdminId = 'otro-admin';
  const eventoId = '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03';

  const datos: RegistrarAsistencia = {
    inscripcionId: '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68',
    metodo: 'qr',
    eventoId,
  };

  const asistenciaConfirmada = jest.fn();
  let service: AsistenciaService;

  beforeEach(() => {
    jest.clearAllMocks();
    const analitica = {
      asistenciaConfirmada,
      eventoPublicado: jest.fn(),
      inscripcionCreada: jest.fn(),
    } as unknown as AnaliticaService;

    service = new AsistenciaService(analitica);
  });

  describe('listarPorEvento', () => {
    it('permite listar al creador del evento', async () => {
      seleccionar
        .mockReturnValueOnce(
          queryMock([{ id: eventoId, creadoPor: creadorId }]),
        )
        .mockReturnValueOnce(
          queryMock([
            {
              inscripcionId: '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68',
              eventoId,
              usuario: {
                id: 'usr-1',
                nombre: 'Tomás',
                email: 't@uade.edu.ar',
                rol: 'estudiante',
              },
              asistenciaId: 'asis-1',
              confirmadaEn: new Date(),
              metodo: 'qr',
            },
          ]),
        );

      const resultado = await service.listarPorEvento(eventoId, creadorId);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.acreditado).toBe(true);
      expect(resultado[0]?.asistencia?.metodo).toBe('qr');
    });

    it('rechaza listar si el evento no existe', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(
        service.listarPorEvento(eventoId, creadorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza listar si el usuario no es el creador', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([{ id: eventoId, creadoPor: creadorId }]),
      );

      await expect(
        service.listarPorEvento(eventoId, otroAdminId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza listar si no se provee usuarioId', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([{ id: eventoId, creadoPor: creadorId }]),
      );

      await expect(
        service.listarPorEvento(eventoId, undefined),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registrar', () => {
    it('registra la asistencia cuando el creador lo solicita y pertenece al evento', async () => {
      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([]));

      const fechaConfirmada = new Date();
      insertar.mockReturnValueOnce({
        values: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'asis-123',
                inscripcionId: datos.inscripcionId,
                confirmadaEn: fechaConfirmada,
                metodo: datos.metodo,
              },
            ]),
        }),
      });

      const res = await service.registrar(datos, creadorId);

      expect(res.id).toBe('asis-123');
      expect(asistenciaConfirmada).toHaveBeenCalledWith(
        expect.objectContaining({
          inscripcionId: datos.inscripcionId,
          eventoId,
          usuarioId: 'usr-1',
        }),
      );
    });

    it('rechaza registrar asistencia en un evento cancelado', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            usuarioId: 'usr-1',
            estado: 'cancelada',
            eventoEstado: 'cancelado',
            eventoCreadoPor: creadorId,
            fechaInicio: new Date(),
          },
        ]),
      );

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        'El evento fue cancelado',
      );
      expect(insertar).not.toHaveBeenCalled();
    });

    it('rechaza cuando no existe la inscripción', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza cuando la inscripción no corresponde al evento seleccionado', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId: 'otro-evento-distinto',
            usuarioId: 'usr-1',
            eventoCreadoPor: creadorId,
            fechaInicio: new Date(),
          },
        ]),
      );

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza cuando quien intenta registrar no es el creador del evento', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            usuarioId: 'usr-1',
            eventoCreadoPor: creadorId,
            fechaInicio: new Date(),
          },
        ]),
      );

      await expect(service.registrar(datos, otroAdminId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza registrar si no se provee usuarioId', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            usuarioId: 'usr-1',
            eventoCreadoPor: creadorId,
            fechaInicio: new Date(),
          },
        ]),
      );

      await expect(service.registrar(datos, undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza cuando falta más de 1 hora para el inicio del evento', async () => {
      // Evento inicia en 2 horas; asistencia aún no está habilitada
      const fechaInicio = new Date('2026-11-25T18:00:00Z');
      const ahora = new Date('2026-11-25T16:50:00Z'); // 1 hora y 10 minutos antes

      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            usuarioId: 'usr-1',
            eventoCreadoPor: creadorId,
            fechaInicio,
          },
        ]),
      );

      await expect(service.registrar(datos, creadorId, ahora)).rejects.toThrow(
        ConflictException,
      );
    });

    it('permite registrar cuando falta menos de 1 hora para el inicio del evento', async () => {
      // Evento inicia a las 18:00; ahora son las 17:15 (45 min antes, dentro de la ventana previa)
      const fechaInicio = new Date('2026-11-25T18:00:00Z');
      const ahora = new Date('2026-11-25T17:15:00Z');

      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio,
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([]));

      insertar.mockReturnValueOnce({
        values: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'asis-123',
                inscripcionId: datos.inscripcionId,
                confirmadaEn: ahora,
                metodo: datos.metodo,
              },
            ]),
        }),
      });

      const res = await service.registrar(datos, creadorId, ahora);
      expect(res.id).toBe('asis-123');
    });

    it('permite registrar durante el transcurso del evento y pos-evento indefinidamente', async () => {
      // Evento inició hace 5 días; debe seguir abierta para reclamos y cambios
      const fechaInicio = new Date('2026-11-01T10:00:00Z');
      const ahora = new Date('2026-11-06T18:00:00Z');

      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio,
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([]));

      insertar.mockReturnValueOnce({
        values: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'asis-123',
                inscripcionId: datos.inscripcionId,
                confirmadaEn: ahora,
                metodo: datos.metodo,
              },
            ]),
        }),
      });

      const res = await service.registrar(datos, creadorId, ahora);
      expect(res.id).toBe('asis-123');
    });

    it('rechaza cuando la asistencia ya fue registrada', async () => {
      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([{ id: 'asis-existente' }]));

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('captura violación de unicidad (error 23505) ante inserciones simultáneas y lanza ConflictException', async () => {
      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([]));

      const error23505 = Object.assign(new Error('duplicate key'), {
        code: '23505',
        detail: 'Key (inscripcion_id)=(...) already exists.',
      });

      insertar.mockReturnValueOnce({
        values: () => ({
          returning: () => Promise.reject(error23505),
        }),
      });

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('relanza cualquier otro error inesperado en la inserción', async () => {
      seleccionar
        .mockReturnValueOnce(
          queryMock([
            {
              id: datos.inscripcionId,
              eventoId,
              usuarioId: 'usr-1',
              eventoCreadoPor: creadorId,
              fechaInicio: new Date(),
            },
          ]),
        )
        .mockReturnValueOnce(queryMock([]));

      insertar.mockReturnValueOnce({
        values: () => ({
          returning: () => Promise.reject(new Error('Fallo de conexión')),
        }),
      });

      await expect(service.registrar(datos, creadorId)).rejects.toThrow(
        'Fallo de conexión',
      );
    });
  });

  describe('revertir', () => {
    it('permite al creador revertir la asistencia de su evento', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            eventoCreadoPor: creadorId,
          },
        ]),
      );
      eliminar.mockReturnValueOnce({
        where: () => Promise.resolve(),
      });

      const res = await service.revertir(
        datos.inscripcionId,
        creadorId,
        eventoId,
      );

      expect(res.exito).toBe(true);
      expect(eliminar).toHaveBeenCalled();
    });

    it('rechaza revertir si la inscripción no existe', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(
        service.revertir(datos.inscripcionId, creadorId, eventoId),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza revertir si la inscripción pertenece a otro evento', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId: 'otro-evento-distinto',
            eventoCreadoPor: creadorId,
          },
        ]),
      );

      await expect(
        service.revertir(datos.inscripcionId, creadorId, eventoId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza revertir si quien lo intenta no es el creador', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            eventoCreadoPor: creadorId,
          },
        ]),
      );

      await expect(
        service.revertir(datos.inscripcionId, otroAdminId, eventoId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza revertir si no se provee usuarioId', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            id: datos.inscripcionId,
            eventoId,
            eventoCreadoPor: creadorId,
          },
        ]),
      );

      await expect(
        service.revertir(datos.inscripcionId, undefined, eventoId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
