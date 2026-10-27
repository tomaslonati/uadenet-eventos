import { AnaliticaService } from './analitica.service';

const EVENTO_ID = '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03';
const INSCRIPCION_ID = '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68';

describe('AnaliticaService', () => {
  let service: AnaliticaService;

  beforeEach(() => {
    service = new AnaliticaService();
  });

  it('publica evento.creado con el shape del contrato', () => {
    service.eventoCreado({
      eventoId: EVENTO_ID,
      titulo: 'Workshop de Testing',
      locacionId: 'c1a4e8d2-7b36-4f90-8e52-1d0a9c3b6f47',
      sede: 'Sede Centro',
      cupoMaximo: 40,
      fechaInicio: '2026-10-22T18:00:00.000Z',
      fechaFin: '2026-10-22T21:00:00.000Z',
      esPago: true,
      categoriaPrecio: 'especial',
    });

    expect(service.publicados).toHaveLength(1);
    expect(service.publicados[0]).toMatchObject({
      tipo: 'evento.creado',
      eventoId: EVENTO_ID,
      categoriaPrecio: 'especial',
    });
    expect(typeof service.publicados[0]?.emitidoEn).toBe('string');
  });

  it('publica inscripcion.registrada con el rol del usuario', () => {
    service.inscripcionRegistrada({
      inscripcionId: INSCRIPCION_ID,
      eventoId: EVENTO_ID,
      usuarioId: 'u-10432',
      rol: 'estudiante',
      pagoConfirmado: true,
    });

    expect(service.publicados[0]).toMatchObject({
      tipo: 'inscripcion.registrada',
      rol: 'estudiante',
      pagoConfirmado: true,
    });
  });

  it('publica asistencia.confirmada', () => {
    service.asistenciaConfirmada({
      inscripcionId: INSCRIPCION_ID,
      eventoId: EVENTO_ID,
      usuarioId: 'u-10432',
      confirmadaEn: '2026-10-22T18:07:44.000Z',
    });

    expect(service.publicados[0]).toMatchObject({
      tipo: 'asistencia.confirmada',
      confirmadaEn: '2026-10-22T18:07:44.000Z',
    });
  });

  it('no publica ni lanza si el payload no respeta el contrato', () => {
    expect(() =>
      service.asistenciaConfirmada({
        inscripcionId: 'no-es-un-uuid',
        eventoId: EVENTO_ID,
        usuarioId: 'u-10432',
        confirmadaEn: '2026-10-22T18:07:44.000Z',
      }),
    ).not.toThrow();
    expect(service.publicados).toHaveLength(0);
  });
});
