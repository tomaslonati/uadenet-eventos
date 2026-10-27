import { CoreTokenService } from './core-token.service';

describe('CoreTokenService', () => {
  let service: CoreTokenService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new CoreTokenService();
    service.limpiarCache();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const urlPedida = () => {
    const llamadas = fetchMock.mock.calls as [string | URL, RequestInit?][];
    const destino = llamadas[0]?.[0];
    return typeof destino === 'string' ? destino : (destino?.toString() ?? '');
  };

  it('solicita token M2M a POST /internal/v1/service-auth/token y lo cachea', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'jwt-events-service-real',
          tokenType: 'Bearer',
          expiresIn: 900,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const token1 = await service.obtenerToken();
    expect(token1).toBe('jwt-events-service-real');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlPedida()).toMatch(/\/internal\/v1\/service-auth\/token$/);

    const token2 = await service.obtenerToken();
    expect(token2).toBe(token1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
