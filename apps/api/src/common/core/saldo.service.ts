import { Injectable, Logger, Optional } from '@nestjs/common';
import { env } from '@repo/env';
import { CoreTokenService } from './core-token.service';

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
  transaccionId?: string;
}

/** Saldo institucional simulado en modo local (sin CORE_BASE_URL). */
const SALDO_DEMO = 10000;

/**
 * Servicio de descuento de saldo institucional contra CORE.
 * Cuando CORE_BASE_URL está configurado, invoca POST /internal/v1/wallets/{userId}/debits
 * con el token de servicio de events-service e Idempotency-Key.
 * Sin CORE_BASE_URL (desarrollo local / tests), opera en modo mock con SALDO_DEMO.
 */
@Injectable()
export class SaldoService {
  private readonly logger = new Logger(SaldoService.name);

  constructor(@Optional() private readonly tokenService?: CoreTokenService) {}

  async descontar(datos: DescuentoSaldo): Promise<ResultadoDescuento> {
    if (!env.CORE_BASE_URL) {
      if (datos.monto > SALDO_DEMO) {
        return {
          aprobado: false,
          saldoRestante: SALDO_DEMO,
          motivo: 'SALDO_INSUFICIENTE',
        };
      }

      return {
        aprobado: true,
        saldoRestante: SALDO_DEMO - datos.monto,
        motivo: null,
        transaccionId: `mock-tx-${datos.referenciaId}`,
      };
    }

    try {
      const token = await this.tokenService?.obtenerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': datos.referenciaId,
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `${env.CORE_BASE_URL}/internal/v1/wallets/${encodeURIComponent(datos.usuarioId)}/debits`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amount: datos.monto.toFixed(2),
            currency: 'ARS',
            concept: 'EVENT_REGISTRATION',
            sourceModule: 'events',
            externalReference: datos.referenciaId,
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (res.ok) {
        const body = (await res.json()) as { transactionId?: string };
        return {
          aprobado: true,
          saldoRestante: 0,
          motivo: null,
          transaccionId: body.transactionId,
        };
      }

      const errorBody = (await res.json().catch(() => ({}))) as {
        code?: string;
        detail?: string;
      };
      return {
        aprobado: false,
        saldoRestante: 0,
        motivo: errorBody.code ?? errorBody.detail ?? `HTTP_${res.status}`,
      };
    } catch (err) {
      this.logger.error(
        `Error al debitar saldo en CORE para ${datos.usuarioId}: ${String(err)}`,
      );
      return {
        aprobado: false,
        saldoRestante: 0,
        motivo: 'CORE_NO_DISPONIBLE',
      };
    }
  }
}
