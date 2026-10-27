import type { CoreTokenService } from './core-token.service';
import { SaldoService } from './saldo.service';

const TX_ID = '8f1e2d3c-4b5a-4789-8abc-def123456789';
const REF_ID = '5e8d0b31-9c47-4a26-b18f-72e4c0d95a68';

const respuesta = (cuerpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('SaldoService', () => {
  let service: SaldoService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const tokenService = {
      obtenerToken: jest.fn().mockResolvedValue('service-jwt'),
    } as unknown as CoreTokenService;
    service = new SaldoService(tokenService);
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

  it('debita saldo en POST /internal/v1/wallets/:userId/debits con Idempotency-Key', async () => {
    fetchMock.mockReturnValueOnce(
      respuesta(
        {
          transactionId: TX_ID,
          userId: 'u-10432',
          type: 'DEBIT',
          status: 'POSTED',
          amount: '5500.00',
          currency: 'ARS',
          balanceAfter: '4500.00',
          concept: 'EVENT_REGISTRATION',
          sourceModule: 'events',
          externalReference: REF_ID,
          createdAt: '2026-10-20T18:00:00.000Z',
        },
        201,
      ),
    );

    const resultado = await service.descontar({
      usuarioId: 'u-10432',
      monto: 5500,
      concepto: 'Inscripción a evento',
      referenciaId: REF_ID,
    });

    expect(resultado).toEqual({
      aprobado: true,
      saldoRestante: 4500,
      motivo: null,
      transaccionId: TX_ID,
    });
    expect(urlPedida()).toMatch(/\/internal\/v1\/wallets\/u-10432\/debits$/);
  });

  it('mapea 422 WALLET_INSUFFICIENT_FUNDS a SALDO_INSUFICIENTE', async () => {
    fetchMock.mockReturnValueOnce(
      respuesta(
        {
          code: 'WALLET_INSUFFICIENT_FUNDS',
          detail: 'Fondos insuficientes',
        },
        422,
      ),
    );

    const resultado = await service.descontar({
      usuarioId: 'u-10432',
      monto: 15000,
      concepto: 'Inscripción a evento',
      referenciaId: REF_ID,
    });

    expect(resultado).toEqual({
      aprobado: false,
      saldoRestante: 0,
      motivo: 'SALDO_INSUFICIENTE',
    });
  });

  it('concilia por referencia ante 409 DUPLICATE_REFERENCE', async () => {
    fetchMock
      .mockReturnValueOnce(
        respuesta(
          {
            code: 'DUPLICATE_REFERENCE',
            meta: { transactionId: TX_ID },
          },
          409,
        ),
      )
      .mockReturnValueOnce(
        respuesta(
          {
            transactionId: TX_ID,
            userId: 'u-10432',
            type: 'DEBIT',
            status: 'POSTED',
            amount: '5500.00',
            currency: 'ARS',
            balanceAfter: '4500.00',
            concept: 'EVENT_REGISTRATION',
            sourceModule: 'events',
            externalReference: REF_ID,
            createdAt: '2026-10-20T18:00:00.000Z',
          },
          200,
        ),
      );

    const resultado = await service.descontar({
      usuarioId: 'u-10432',
      monto: 5500,
      concepto: 'Inscripción a evento',
      referenciaId: REF_ID,
    });

    expect(resultado.aprobado).toBe(true);
    expect(resultado.transaccionId).toBe(TX_ID);
  });

  it('revierte una transacción en POST /internal/v1/wallet-transactions/:id/reversals', async () => {
    fetchMock.mockReturnValueOnce(
      respuesta(
        {
          transactionId: '11111111-2222-4333-8444-555555555555',
          userId: 'u-10432',
          type: 'REVERSAL',
          status: 'POSTED',
          amount: '5500.00',
          currency: 'ARS',
          balanceAfter: '10000.00',
          concept: 'Fallo al persistir inscripción',
          sourceModule: 'events',
          externalReference: REF_ID,
          createdAt: '2026-10-20T18:01:00.000Z',
        },
        201,
      ),
    );

    const reversa = await service.revertir(
      TX_ID,
      'Fallo al persistir inscripción',
    );
    expect(reversa?.type).toBe('REVERSAL');
    expect(urlPedida()).toMatch(
      new RegExp(`/internal/v1/wallet-transactions/${TX_ID}/reversals$`),
    );
  });
});
