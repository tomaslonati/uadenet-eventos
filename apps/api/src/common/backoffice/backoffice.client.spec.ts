import { BackofficeClient } from './backoffice.client';

const SEDE_ID = 'a1b2c3d4-0001-4a00-8000-000000000001';

const respuesta = (cuerpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('BackofficeClient', () => {
  const cliente = new BackofficeClient();
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
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

  it('lista las sedes en GET /api/v1/backoffice/sedes', async () => {
    fetchMock.mockReturnValue(
      respuesta([{ id: SEDE_ID, nombre: 'Sede Centro' }]),
    );

    await expect(cliente.listarSedes()).resolves.toEqual([
      { id: SEDE_ID, nombre: 'Sede Centro' },
    ]);
    expect(urlPedida()).toMatch(/\/api\/v1\/backoffice\/sedes$/);
  });

  it('pide los espacios por sede con el filtro aptoEventos', async () => {
    fetchMock.mockReturnValue(respuesta([]));

    await cliente.listarEspacios(SEDE_ID, { aptoEventos: true });

    expect(urlPedida()).toMatch(
      new RegExp(
        `/api/v1/backoffice/sedes/${SEDE_ID}/espacios\\?aptoEventos=true$`,
      ),
    );
  });

  it('pide la tarifa vigente por concepto y fecha', async () => {
    fetchMock.mockReturnValue(
      respuesta({
        concepto: 'EVENTO_INSCRIPCION_GENERAL',
        sede: null,
        ambitoResuelto: 'GLOBAL',
        monto: 1800,
        moneda: 'ARS',
        unidad: 'MONTO_FIJO',
        vigencia: { desde: '2026-10-01', hasta: null },
        tarifaId: '8f1e2d3c-4b5a-4789-8abc-def123456789',
      }),
    );

    const tarifa = await cliente.tarifaVigente(
      'EVENTO_INSCRIPCION_GENERAL',
      '2026-10-06',
    );

    expect(tarifa?.monto).toBe(1800);
    expect(urlPedida()).toMatch(
      /\/api\/v1\/backoffice\/tarifas\/vigente\?concepto=EVENTO_INSCRIPCION_GENERAL&fecha=2026-10-06$/,
    );
  });

  it('devuelve null cuando no hay tarifa vigente (404)', async () => {
    fetchMock.mockReturnValue(respuesta({ message: 'No hay tarifa' }, 404));

    await expect(
      cliente.tarifaVigente('EVENTO_INSCRIPCION_ESPECIAL', '2026-10-06'),
    ).resolves.toBeNull();
  });

  it('falla ante cualquier otro error de Backoffice', async () => {
    fetchMock.mockReturnValue(respuesta({}, 500));

    await expect(cliente.listarSedes()).rejects.toThrow('500');
  });

  it('obtiene los datos de un usuario por id', async () => {
    fetchMock.mockReturnValue(
      respuesta({
        id: 'u-1',
        nombre: 'Mariana Ibarra',
        email: 'm.ibarra@uadenet.edu',
        rol: 'administrativo',
        sede: 'Sede Centro',
      }),
    );

    const usuario = await cliente.obtenerUsuario('u-1');
    expect(usuario.nombre).toBe('Mariana Ibarra');
    expect(urlPedida()).toMatch(/\/api\/v1\/backoffice\/usuarios\/u-1$/);
  });

  it('falla si la respuesta no respeta el contrato', async () => {
    fetchMock.mockReturnValue(respuesta([{ id: SEDE_ID }]));

    await expect(cliente.listarSedes()).rejects.toThrow();
  });

  it('resuelve en memoria sin llamadas HTTP a localhost cuando corre en Vercel serverless sin BACKOFFICE_BASE_URL', async () => {
    const previo = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      const sedes = await cliente.listarSedes();
      const tarifa = await cliente.tarifaVigente(
        'EVENTO_INSCRIPCION_GENERAL',
        '2026-10-20',
      );
      expect(sedes.length).toBeGreaterThan(0);
      expect(tarifa?.monto).toBe(5500);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (previo === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = previo;
      }
    }
  });
});
