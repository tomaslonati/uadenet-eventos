import { Injectable } from '@nestjs/common';

export interface DescuentoSaldo {
  usuarioId: string;
  monto: number;
  concepto: string;
  referenciaId: string;
}

export interface ResultadoDescuento {
  aprobado: boolean;
  saldoRestante: number;
  motivo: string | null;
}

/** Saldo institucional simulado, igual para todos los usuarios. */
const SALDO_DEMO = 10000;

/**
 * Mock del descuento de saldo institucional de CORE. El contrato real sigue
 * pendiente (ver docs/02-arquitectura/integraciones.md); la estructura de
 * request/respuesta es la publicada en flujo-de-datos-integraciones.md.
 * No reemplazar por una llamada HTTP hasta que CORE publique el endpoint.
 */
@Injectable()
export class SaldoService {
  descontar(datos: DescuentoSaldo): Promise<ResultadoDescuento> {
    if (datos.monto > SALDO_DEMO) {
      return Promise.resolve({
        aprobado: false,
        saldoRestante: SALDO_DEMO,
        motivo: 'SALDO_INSUFICIENTE',
      });
    }

    return Promise.resolve({
      aprobado: true,
      saldoRestante: SALDO_DEMO - datos.monto,
      motivo: null,
    });
  }
}
