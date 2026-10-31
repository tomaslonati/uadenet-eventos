import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { Asistencia, RegistrarAsistencia } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();
const eliminar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, insert: insertar, delete: eliminar },
  };
});

import type { AnaliticaService } from '../../common/analitica/analitica.service';
import { AsistenciaService } from './asistencia.service';

/** Mock encadenable para Drizzle: select().from().innerJoin().leftJoin().where().orderBy()/limit() */
const queryMock = (resultado: unknown[]) => {
  const chain: any = {
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

  const asistenciaCreada = {
    id: '7c3e1a95-2b48-4d60-9f13-0a5e8c4b7d21',
    inscripcionId: datos.inscripcionId,
    confirmadaEn: new Date('2026-10-22T18:07:44Z'),
    metodo: 'qr',
  } as Asistencia;

  const inscripcionConEvento = {
    id: datos.inscripcionId,
    eventoId,
    usuarioId: 'alumno-1',
    eventoCreadoPor: creadorId,
  };

  let service: AsistenciaService;
  let asistenciaConfirmada: jest.Mock;

  beforeEach(() => {
    asistenciaConfirmada = jest.fn();
    service = new AsistenciaService({
      asistenciaConfirmada,
    } as unknown as AnaliticaService);
    seleccionar.mockReset();
    insertar.mockReset();
    eliminar.mockReset();
  });

  describe('listarPorEvento', () => {
    it('permite listar al creador del evento', async () => {
      seleccionar
        .mockReturnValueOnce(queryMock([{ id: eventoId, creadoPor: creadorId }]))
        .mockReturnValueOnce(
          queryMock([
            {
              inscripcionId: datos.inscripcionId,
              eventoId,
              usuario: {
                id: 'alumno-1',
                nombre: 'Tomás Vidal',
                email: 't.vidal@uadenet.edu',
                rol: 'estudiante',
              },
              asistenciaId: null,
              confirmadaEn: null,
              metodo: null,
            },
          ]),
        );

      const resultado = await service.listarPorEvento(eventoId, creadorId);
      expect(resultado).toHaveLength(1);
      expect(resultado[0]!.acreditado).toBe(false);
      expect(resultado[0]!.usuario.nombre).toBe('Tomás Vidal');
    });

    it('rechaza listar si el evento no existe', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(
        service.listarPorEvento(eventoId, creadorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza listar si el usuario no es el creador', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([{ id: eventoId, creadoPor: creadorId }]),
      );

      await expect(
        service.listarPorEvento(eventoId, otroAdminId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('registrar', () => {
    it('registra la asistencia cuando el creador lo solicita y pertenece al evento', async () => {
      seleccionar
        .mockReturnValueOnce(queryMock([inscripcionConEvento]))
        .mockReturnValueOnce(queryMock([]));
      insertar.mockReturnValue({
        values: () => ({ returning: () => Promise.resolve([asistenciaCreada]) }),
      });

      await expect(service.registrar(datos, creadorId)).resolves.toEqual(
        asistenciaCreada,
      );
      expect(asistenciaConfirmada).toHaveBeenCalledWith({
        inscripcionId: datos.inscripcionId,
        eventoId: inscripcionConEvento.eventoId,
        usuarioId: inscripcionConEvento.usuarioId,
        confirmadaEn: '2026-10-22T18:07:44.000Z',
      });
    });

    it('rechaza cuando no existe la inscripción', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(service.registrar(datos, creadorId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(insertar).not.toHaveBeenCalled();
    });

    it('rechaza cuando la inscripción no corresponde al evento seleccionado', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            ...inscripcionConEvento,
            eventoId: '00000000-0000-0000-0000-000000000000',
          },
        ]),
      );

      await expect(service.registrar(datos, creadorId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(insertar).not.toHaveBeenCalled();
    });

    it('rechaza cuando quien intenta registrar no es el creador del evento', async () => {
      seleccionar.mockReturnValueOnce(queryMock([inscripcionConEvento]));

      await expect(service.registrar(datos, otroAdminId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(insertar).not.toHaveBeenCalled();
    });

    it('rechaza cuando la asistencia ya fue registrada', async () => {
      seleccionar
        .mockReturnValueOnce(queryMock([inscripcionConEvento]))
        .mockReturnValueOnce(queryMock([{ id: asistenciaCreada.id }]));

      await expect(service.registrar(datos, creadorId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(insertar).not.toHaveBeenCalled();
      expect(asistenciaConfirmada).not.toHaveBeenCalled();
    });
  });

  describe('revertir', () => {
    it('permite al creador revertir la asistencia de su evento', async () => {
      seleccionar.mockReturnValueOnce(queryMock([inscripcionConEvento]));
      eliminar.mockReturnValue({
        where: () => Promise.resolve(),
      });

      const res = await service.revertir(
        datos.inscripcionId,
        creadorId,
        eventoId,
      );
      expect(res).toEqual({ exito: true });
      expect(eliminar).toHaveBeenCalled();
    });

    it('rechaza revertir si la inscripción no existe', async () => {
      seleccionar.mockReturnValueOnce(queryMock([]));

      await expect(
        service.revertir(datos.inscripcionId, creadorId, eventoId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(eliminar).not.toHaveBeenCalled();
    });

    it('rechaza revertir si la inscripción pertenece a otro evento', async () => {
      seleccionar.mockReturnValueOnce(
        queryMock([
          {
            ...inscripcionConEvento,
            eventoId: '00000000-0000-0000-0000-000000000000',
          },
        ]),
      );

      await expect(
        service.revertir(datos.inscripcionId, creadorId, eventoId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(eliminar).not.toHaveBeenCalled();
    });

    it('rechaza revertir si quien lo intenta no es el creador', async () => {
      seleccionar.mockReturnValueOnce(queryMock([inscripcionConEvento]));

      await expect(
        service.revertir(datos.inscripcionId, otroAdminId, eventoId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(eliminar).not.toHaveBeenCalled();
    });
  });

  it('quita la asistencia registrada por error', async () => {
    borrar.mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([{ id: asistenciaCreada.id }]),
      }),
    });

    await expect(service.quitar(datos.inscripcionId)).resolves.toBeUndefined();
  });

  it('responde 404 al quitar una asistencia que no existe', async () => {
    borrar.mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([]) }),
    });

    await expect(service.quitar(datos.inscripcionId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
