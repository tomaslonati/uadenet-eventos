import { Injectable, Logger } from '@nestjs/common';
import { env } from '@repo/env';

export interface TokenRespuesta {
  access_token?: string;
  accessToken?: string;
  token?: string;
  token_type?: string;
  expires_in?: number;
  expiresIn?: number;
}

/**
 * Gestiona el token de servicio emitido por CORE para llamadas directas
 * entre módulos (ej: Eventos -> Backoffice), cacheándolo ~15 minutos.
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

    if (!env.CORE_BASE_URL) {
      // Sin CORE_BASE_URL en local/tests, generamos token simulado con el clientId
      this.tokenCache = `mock-service-token-${env.CORE_CLIENT_ID}`;
      this.expiraEn = ahora + 15 * 60 * 1000;
      return this.tokenCache;
    }

    try {
      const res = await fetch(
        `${env.CORE_BASE_URL}/internal/v1/service-auth/token`,
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

      const datos = (await res.json()) as TokenRespuesta;
      const ttlSegundos = datos.expires_in ?? datos.expiresIn ?? 15 * 60;
      const ttlMs = ttlSegundos * 1000 - 30_000;
      this.tokenCache =
        datos.access_token ?? datos.accessToken ?? datos.token ?? null;
      this.expiraEn = ahora + Math.max(ttlMs, 60_000);
      return this.tokenCache;
    } catch (err) {
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
