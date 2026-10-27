import { CoreTokenService } from './core-token.service';

describe('CoreTokenService', () => {
  let service: CoreTokenService;

  beforeEach(() => {
    service = new CoreTokenService();
    service.limpiarCache();
  });

  it('obtiene y cachea un token de servicio', async () => {
    const token1 = await service.obtenerToken();
    expect(token1).toBeTruthy();
    expect(token1).toContain('events-service');

    const token2 = await service.obtenerToken();
    expect(token2).toBe(token1);
  });
});
