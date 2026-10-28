import { ConflictException } from '@nestjs/common';
import type { TarifaVigente } from '@repo/contracts';
import type { BackofficeClient } from './backoffice.client';
import { TarifasService } from './tarifas.service';

const tarifa = (
  concepto: TarifaVigente['concepto'],
  monto: number,
): TarifaVigente => ({
  concepto,
  sede: null,
  ambitoResuelto: 'GLOBAL',
  monto,
  moneda: 'ARS',
  unidad: 'MONTO_FIJO',
  vigencia: { desde: '2026-10-01', hasta: null },
  tarifaId: '8f1e2d3c-4b5a-4789-8abc-def123456789',
});

describe('TarifasService', () => {
  let tarifaVigente: jest.Mock;
  let service: TarifasService;

  beforeEach(() => {
    tarifaVigente = jest.fn((concepto: TarifaVigente['concepto']) =>
      Promise.resolve(
        concepto === 'EVENTO_INSCRIPCION_GENERAL'
          ? tarifa(concepto, 1_800)
          : tarifa(concepto, 4_500.4),
      ),
    );
    service = new TarifasService({
      tarifaVigente,
    } as unknown as BackofficeClient);
  });

  it('consulta el concepto de Backoffice que corresponde a cada categoría', async () => {
    await service.refrescar();

    expect(tarifaVigente).toHaveBeenCalledWith(
      'EVENTO_INSCRIPCION_GENERAL',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(tarifaVigente).toHaveBeenCalledWith(
      'EVENTO_INSCRIPCION_ESPECIAL',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('resuelve el precio desde el caché, redondeado a pesos enteros', async () => {
    await service.refrescar();
    tarifaVigente.mockClear();

    expect(service.precioDe('general')).toBe(1_800);
    expect(service.precioDe('especial')).toBe(4_500);
    expect(tarifaVigente).not.toHaveBeenCalled();
  });

  it('devuelve null para un evento gratuito o antes del primer refresh', () => {
    expect(service.precioDe(null)).toBeNull();
    expect(service.precioDe('general')).toBeNull();
  });

  it('exigirPrecio rechaza cuando no hay tarifa vigente', () => {
    expect(() => service.exigirPrecio('general')).toThrow(ConflictException);
  });

  it('saca del caché la categoría cuando Backoffice responde 404 (sin tarifa vigente)', async () => {
    await service.refrescar();
    tarifaVigente.mockResolvedValue(null);

    await service.refrescar();

    expect(service.precioDe('general')).toBeNull();
    expect(() => service.exigirPrecio('especial')).toThrow(ConflictException);
  });

  it('conserva la última tarifa conocida si Backoffice no responde', async () => {
    await service.refrescar();
    tarifaVigente.mockRejectedValue(new Error('timeout'));

    await service.refrescar();

    expect(service.precioDe('general')).toBe(1_800);
  });

  it('asegurarCargado hidrata el caché en frío una sola vez', async () => {
    await Promise.all([service.asegurarCargado(), service.asegurarCargado()]);

    expect(service.precioDe('general')).toBe(1_800);
    expect(service.precioDe('especial')).toBe(4_500);
    expect(tarifaVigente).toHaveBeenCalledTimes(2);
  });
});
