import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  coreJwtClaimsSchema,
  jwksResponseSchema,
  type CoreJwtClaims,
  type Jwk,
} from '@repo/contracts';
import {
  obtenerCoreBaseUrl,
  obtenerJwkPublicaDemo,
  USA_CORE_MOCK,
} from './core-crypto';

const TTL_JWKS_MS = 10 * 60_000;
const TIMEOUT_MS = 5_000;

interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

/**
 * Valida localmente los JWT emitidos por CORE usando sus claves públicas RS256
 * publicadas en `GET /.well-known/jwks.json`.
 */
@Injectable()
export class CoreJwksService {
  private readonly logger = new Logger(CoreJwksService.name);
  private readonly claves = new Map<string, KeyObject>();
  private expiraEn = 0;

  async verificarToken(token: string): Promise<CoreJwtClaims> {
    const partes = token.split('.');
    if (partes.length !== 3) {
      throw new UnauthorizedException('Formato de JWT inválido.');
    }

    const [headerB64, payloadB64, firmaB64] = partes as [
      string,
      string,
      string,
    ];

    let header: JwtHeader;
    let payloadCrudo: unknown;
    try {
      header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString('utf8'),
      ) as JwtHeader;
      payloadCrudo = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      );
    } catch {
      throw new UnauthorizedException('No se pudo decodificar el JWT de CORE.');
    }

    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException(
        'El JWT de CORE debe estar firmado con RS256 e incluir kid.',
      );
    }

    const clavePublica = await this.obtenerClavePublica(header.kid);
    if (!clavePublica) {
      throw new UnauthorizedException(
        `Clave pública JWKS no encontrada para kid "${header.kid}".`,
      );
    }

    const datosFirmados = Buffer.from(`${headerB64}.${payloadB64}`);
    const firma = Buffer.from(firmaB64, 'base64url');
    const firmaValida = verify(
      'RSA-SHA256',
      datosFirmados,
      clavePublica,
      firma,
    );

    if (!firmaValida) {
      throw new UnauthorizedException('Firma del JWT de CORE inválida.');
    }

    const resultado = coreJwtClaimsSchema.safeParse(payloadCrudo);
    if (!resultado.success) {
      throw new UnauthorizedException('Claims del JWT de CORE inválidos.');
    }

    const claims = resultado.data;
    if (claims.exp !== undefined && claims.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('El JWT de CORE ha expirado.');
    }

    return claims;
  }

  limpiarCache(): void {
    this.claves.clear();
    this.expiraEn = 0;
  }

  private async obtenerClavePublica(kid: string): Promise<KeyObject | null> {
    const ahora = Date.now();
    if (ahora < this.expiraEn && this.claves.has(kid)) {
      return this.claves.get(kid) ?? null;
    }

    await this.refrescarJwks();
    return this.claves.get(kid) ?? null;
  }

  private async refrescarJwks(): Promise<void> {
    let jwks: Jwk[] = [];
    try {
      const res = await fetch(`${obtenerCoreBaseUrl()}/.well-known/jwks.json`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const parsed = jwksResponseSchema.parse(await res.json());
      jwks = parsed.keys;
    } catch (error) {
      if (USA_CORE_MOCK) {
        jwks = [obtenerJwkPublicaDemo()];
      } else {
        this.logger.warn(
          `No se pudo refrescar JWKS desde CORE: ${String(error)}`,
        );
        return;
      }
    }

    this.claves.clear();
    for (const jwk of jwks) {
      try {
        const keyObject = createPublicKey({
          key: jwk,
          format: 'jwk',
        });
        this.claves.set(jwk.kid, keyObject);
      } catch (err) {
        this.logger.warn(`No se pudo importar JWK ${jwk.kid}: ${String(err)}`);
      }
    }
    this.expiraEn = Date.now() + TTL_JWKS_MS;
  }
}
