import type { CoreTokenService } from './core-token.service';
import { NotificacionesService } from './notificaciones.service';

const EVENTO_ID = '9f2b7c14-3d5a-4e88-9a10-6c2d5e7f1b03';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const tokenService = {
      obtenerToken: jest.fn().mockResolvedValue('service-jwt'),
    } as unknown as CoreTokenService;
    service = new NotificacionesService(tokenService);
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ACCEPTED' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const urlEn = (indice: number) => {
    const llamadas = fetchMock.mock.calls as [string | URL, RequestInit?][];
    const destino = llamadas[indice]?.[0];
    return typeof destino === 'string' ? destino : (destino?.toString() ?? '');
  };

  it('valida el recordatorio y publica a /internal/v1/notifications y /internal/v1/events', async () => {
    const ok = await service.enviarRecordatorio({
      usuarioId: 'u-10432',
      eventoId: EVENTO_ID,
      titulo: 'Workshop de Testing',
      fechaInicio: '2026-10-22T18:00:00.000Z',
      locacion: 'Aula Magna — Monserrat',
    });

    expect(ok).toBe(true);
    expect(service.enviados).toHaveLength(1);
    expect(service.enviados[0]).toMatchObject({
      tipo: 'evento.recordatorio',
      usuarioId: 'u-10432',
      eventoId: EVENTO_ID,
      url: `https://uadenet-eventos.vercel.app/eventos/${EVENTO_ID}`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlEn(0)).toMatch(/\/internal\/v1\/notifications$/);
    expect(urlEn(1)).toMatch(/\/internal\/v1\/events$/);
  });

  describe('enviarAviso', () => {
    const aviso = {
      tipo: 'evento.cancelado' as const,
      usuarioId: 'u-10432',
      eventoId: EVENTO_ID,
      titulo: 'Workshop de Testing',
      mensaje: 'Se canceló «Workshop de Testing». Motivo: lluvia.',
      referencia: `evento/${EVENTO_ID}/cancelado`,
    };

    const cuerpoEnviado = () => {
      const llamadas = fetchMock.mock.calls as [string, RequestInit][];
      return JSON.parse(llamadas[0]![1].body as string) as Record<
        string,
        string
      >;
    };

    it('publica una notificación de CORE con el tipo, la referencia y el link al evento', async () => {
      await expect(service.enviarAviso(aviso)).resolves.toBe(true);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(urlEn(0)).toMatch(/\/internal\/v1\/notifications$/);
      expect(cuerpoEnviado()).toMatchObject({
        userId: 'u-10432',
        type: 'EVENT_CANCELLED',
        sourceModule: 'events',
        sourceReference: aviso.referencia,
        actionUrl: `https://uadenet-eventos.vercel.app/eventos/${EVENTO_ID}`,
      });
    });

    it('usa EVENT_RESCHEDULED para una reprogramación', async () => {
      await service.enviarAviso({ ...aviso, tipo: 'evento.reprogramado' });

      expect(cuerpoEnviado()).toMatchObject({ type: 'EVENT_RESCHEDULED' });
    });

    it('toma como entregado un aviso que CORE ya tenía (409)', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response('{}', { status: 409 })),
      );

      await expect(service.enviarAviso(aviso)).resolves.toBe(true);
    });

    it('devuelve false sin lanzar si CORE no responde', async () => {
      fetchMock.mockImplementation(() => Promise.reject(new Error('caído')));

      await expect(service.enviarAviso(aviso)).resolves.toBe(false);
      expect(service.avisos).toHaveLength(1);
    });
  });
});
