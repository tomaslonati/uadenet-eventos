import { Injectable } from '@nestjs/common';
import type { CategoriaPrecio } from '@repo/contracts';

/** Valores fijos, deben coincidir con `apps/web/lib/mock/eventos.ts` (TARIFAS_INSCRIPCION). */
const TARIFAS: Record<CategoriaPrecio, number> = {
  general: 5_500,
  especial: 12_500,
};

/**
 * Mock de la parametrización tarifaria de Backoffice Administrativo. El
 * contrato real sigue pendiente (ver docs/02-arquitectura/integraciones.md);
 * la estructura es la publicada en flujo-de-datos-integraciones.md. No
 * reemplazar por una llamada HTTP hasta que Backoffice publique el endpoint.
 */
@Injectable()
export class TarifasService {
  consultar(categoria: CategoriaPrecio): Promise<number> {
    return Promise.resolve(TARIFAS[categoria]);
  }
}
