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
});
