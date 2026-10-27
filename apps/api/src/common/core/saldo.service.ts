import { randomUUID } from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  walletBalanceSchema,
  walletTransactionSchema,
  type WalletBalance,
  type WalletTransaction,
} from '@repo/contracts';
import { obtenerCoreBaseUrl } from './core-crypto';
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

/**
 * Cliente HTTP de billetera institucional de CORE:
 * - Consulta de saldo (`GET /api/v1/wallets/me` / `GET /internal/v1/wallets/{userId}`)
 * - Débito idempotente (`POST /internal/v1/wallets/{userId}/debits`)
 * - Reversa / compensación (`POST /internal/v1/wallet-transactions/{transactionId}/reversals`)
 * - Conciliación por referencia (`GET /internal/v1/wallet-transactions/by-reference`)
 */
@Injectable()
export class SaldoService {
  private readonly logger = new Logger(SaldoService.name);

  constructor(@Optional() private readonly tokenService?: CoreTokenService) {}

  async consultarSaldo(
    usuarioId: string,
    tokenUsuario?: string,
  ): Promise<WalletBalance> {
    const baseUrl = obtenerCoreBaseUrl();
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (tokenUsuario) {
      headers.Authorization = `Bearer ${tokenUsuario}`;
      headers['X-User-Id'] = usuarioId;
      const res = await fetch(`${baseUrl}/api/v1/wallets/me`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        throw new Error(
          `CORE respondió ${res.status} en GET /api/v1/wallets/me`,
        );
      }
      return walletBalanceSchema.parse(await res.json());
    }

    const serviceToken = await this.tokenService?.obtenerToken();
    if (serviceToken) {
      headers.Authorization = `Bearer ${serviceToken}`;
    }

    const res = await fetch(
      `${baseUrl}/internal/v1/wallets/${encodeURIComponent(usuarioId)}`,
      {
        headers,
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) {
      throw new Error(
        `CORE respondió ${res.status} en GET /internal/v1/wallets/${usuarioId}`,
      );
    }
    return walletBalanceSchema.parse(await res.json());
  }

  async descontar(datos: DescuentoSaldo): Promise<ResultadoDescuento> {
    const baseUrl = obtenerCoreBaseUrl();
    try {
      const token = await this.tokenService?.obtenerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': datos.referenciaId,
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `${baseUrl}/internal/v1/wallets/${encodeURIComponent(datos.usuarioId)}/debits`,
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
        const tx = walletTransactionSchema.parse(await res.json());
        return {
          aprobado: true,
          saldoRestante: Math.round(Number.parseFloat(tx.balanceAfter)),
          motivo: null,
          transaccionId: tx.transactionId,
        };
      }

      const errorBody = (await res.json().catch(() => ({}))) as {
        code?: string;
        detail?: string;
        meta?: { transactionId?: string };
      };

      if (res.status === 409 && errorBody.code === 'DUPLICATE_REFERENCE') {
        const conciliada = await this.conciliarPorReferencia(
          datos.referenciaId,
        );
        if (conciliada && conciliada.status === 'POSTED') {
          return {
            aprobado: true,
            saldoRestante: Math.round(
              Number.parseFloat(conciliada.balanceAfter),
            ),
            motivo: null,
            transaccionId: conciliada.transactionId,
          };
        }
      }

      const motivo =
        errorBody.code === 'WALLET_INSUFFICIENT_FUNDS'
          ? 'SALDO_INSUFICIENTE'
          : (errorBody.code ?? errorBody.detail ?? `HTTP_${res.status}`);

      return {
        aprobado: false,
        saldoRestante: 0,
        motivo,
      };
    } catch (err) {
      this.logger.warn(
        `Fallo al debitar saldo en CORE para ${datos.usuarioId}, intentando conciliar por referencia: ${String(err)}`,
      );
      const conciliada = await this.conciliarPorReferencia(
        datos.referenciaId,
      ).catch(() => null);
      if (conciliada && conciliada.status === 'POSTED') {
        return {
          aprobado: true,
          saldoRestante: Math.round(Number.parseFloat(conciliada.balanceAfter)),
          motivo: null,
          transaccionId: conciliada.transactionId,
        };
      }

      return {
        aprobado: false,
        saldoRestante: 0,
        motivo: 'CORE_NO_DISPONIBLE',
      };
    }
  }

  async revertir(
    transaccionId: string,
    motivo: string,
    monto?: number,
  ): Promise<WalletTransaction | null> {
    try {
      const token = await this.tokenService?.obtenerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': randomUUID(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `${obtenerCoreBaseUrl()}/internal/v1/wallet-transactions/${encodeURIComponent(transaccionId)}/reversals`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reason: motivo,
            ...(monto !== undefined ? { amount: monto.toFixed(2) } : {}),
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!res.ok) {
        this.logger.warn(
          `CORE respondió ${res.status} al revertir transacción ${transaccionId}`,
        );
        return null;
      }

      return walletTransactionSchema.parse(await res.json());
    } catch (err) {
      this.logger.error(
        `Error al revertir transacción ${transaccionId} en CORE: ${String(err)}`,
      );
      return null;
    }
  }

  async conciliarPorReferencia(
    referenciaId: string,
  ): Promise<WalletTransaction | null> {
    const token = await this.tokenService?.obtenerToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const query = new URLSearchParams({
      sourceModule: 'events',
      externalReference: referenciaId,
    });
    const res = await fetch(
      `${obtenerCoreBaseUrl()}/internal/v1/wallet-transactions/by-reference?${query.toString()}`,
      {
        headers,
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (res.status === 404 || !res.ok) {
      return null;
    }

    return walletTransactionSchema.parse(await res.json());
  }
}
