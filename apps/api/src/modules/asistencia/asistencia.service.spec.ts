import { ConflictException } from '@nestjs/common';
import type * as RepoDb from '@repo/db';
import type { Asistencia, RegistrarAsistencia } from '@repo/contracts';

const seleccionar = jest.fn();
const insertar = jest.fn();

jest.mock('@repo/db', () => {
  const actual = jest.requireActual<typeof RepoDb>('@repo/db');
  return {
    ...actual,
    db: { select: seleccionar, insert: insertar },
  };
});

import type { AnaliticaService } from '../../common/analitica/analitica.service';
import { AsistenciaService } from './asistencia.service';

/** `db.select(...).from(...).where(...).limit(1)` */
const filas = (resultado: Record<string, string>[]) => ({
  from: () => ({ where: () => ({ limit: () => Promise.resolve(resultado) }) }),
});

describe('AsistenciaService', () => {
  const datos: RegistrarAsistencia = {
    inscripcionId: '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68',
    metodo: 'qr',
  };

  const asistenciaCreada = {
    id: '7c3e1a95-2b48-4d60-9f13-0a5e8c4b7d21',
    inscripcionId: datos.inscripcionId,
    confirmadaEn: new Date('2026-10-22T18:07:44Z'),
    metodo: 'qr',
  } as Asistencia;

  const inscripcion = {
    id: datos.inscripcionId,
    eventoId: '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03',
    usuarioId: 'seed-admin-demo',
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
  });

  it('registra la asistencia de una inscripción existente', async () => {
    seleccionar
      .mockReturnValueOnce(filas([inscripcion]))
      .mockReturnValueOnce(filas([]));
    insertar.mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([asistenciaCreada]) }),
    });

    await expect(service.registrar(datos)).resolves.toEqual(asistenciaCreada);
    expect(asistenciaConfirmada).toHaveBeenCalledWith({
      inscripcionId: datos.inscripcionId,
      eventoId: inscripcion.eventoId,
      usuarioId: inscripcion.usuarioId,
      confirmadaEn: '2026-10-22T18:07:44.000Z',
    });
  });

  it('rechaza cuando no existe la inscripción', async () => {
    seleccionar.mockReturnValueOnce(filas([]));

    await expect(service.registrar(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza cuando la asistencia ya fue registrada', async () => {
    seleccionar
      .mockReturnValueOnce(filas([inscripcion]))
      .mockReturnValueOnce(filas([{ id: asistenciaCreada.id }]));

    await expect(service.registrar(datos)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(insertar).not.toHaveBeenCalled();
    expect(asistenciaConfirmada).not.toHaveBeenCalled();
  });
});
