import { Injectable, Logger } from '@nestjs/common';
import { serviceTokenResponseSchema } from '@repo/contracts';
import { env } from '@repo/env';
import {
  firmarJwtCore,
  obtenerCoreBaseUrl,
  USA_CORE_MOCK,
} from './core-crypto';

/**
 * Gestiona el token de servicio M2M emitido por CORE (`POST /internal/v1/service-auth/token`)
 * para llamadas entre módulos (Eventos -> CORE y Eventos -> Backoffice), cacheándolo ~15 min.
 */
@Injectable()
export class CoreTokenService {
  private readonly logger = new Logger(CoreTokenService.name);
  private tokenCache: string | null = null;
  private expiraEn = 0;

  async obtenerToken(): Promise<string | null> {
    if (!env.CORE_CLIENT_ID || !env.CORE_CLIENT_SECRET) {
      return null;
    }

    const ahora = Date.now();
    if (this.tokenCache && ahora < this.expiraEn) {
      return this.tokenCache;
    }

    try {
      const res = await fetch(
        `${obtenerCoreBaseUrl()}/internal/v1/service-auth/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: env.CORE_CLIENT_ID,
            clientSecret: env.CORE_CLIENT_SECRET,
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!res.ok) {
        this.logger.warn(
          `CORE respondió ${res.status} al solicitar token de servicio`,
        );
        return null;
      }

      const datos = serviceTokenResponseSchema.parse(await res.json());
      const ttlSegundos = datos.expiresIn ?? datos.expires_in ?? 15 * 60;
      const ttlMs = ttlSegundos * 1000 - 30_000;
      this.tokenCache =
        datos.accessToken ?? datos.access_token ?? datos.token ?? null;
      this.expiraEn = ahora + Math.max(ttlMs, 60_000);
      return this.tokenCache;
    } catch (err) {
      if (USA_CORE_MOCK) {
        this.tokenCache = firmarJwtCore(
          {
            sub: env.CORE_CLIENT_ID,
            roles: ['SERVICE'],
            permissions: [
              'wallet:debit:any',
              'wallet:read:any',
              'events:publish',
              'notifications:send',
            ],
          },
          900,
        );
        this.expiraEn = ahora + 14 * 60_000;
        return this.tokenCache;
      }

      this.logger.warn(
        `No se pudo obtener el token de servicio de CORE: ${String(err)}`,
      );
      return null;
    }
  }

  /** Permite limpiar la caché en pruebas unitarias */
  limpiarCache(): void {
    this.tokenCache = null;
    this.expiraEn = 0;
  }
}
