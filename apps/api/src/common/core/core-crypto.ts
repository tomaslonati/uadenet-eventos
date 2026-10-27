import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';
import type { CoreJwtClaims, Jwk } from '@repo/contracts';
import { env } from '@repo/env';

export const CORE_DEMO_KID = 'core-rsa-key-1';

/** Sin `CORE_BASE_URL` se monta el controlador simulado de CORE en esta misma API. */
export const USA_CORE_MOCK = env.CORE_BASE_URL === undefined;

export function obtenerCoreBaseUrl(): string {
  return (
    env.CORE_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}/api/v1/core`
  );
}

let parClavesDemo: { privateKey: KeyObject; publicKey: KeyObject } | null =
  null;

function asegurarClavesDemo(): { privateKey: KeyObject; publicKey: KeyObject } {
  if (!parClavesDemo) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    parClavesDemo = {
      privateKey: createPrivateKey(
        privateKey.export({ type: 'pkcs8', format: 'pem' }),
      ),
      publicKey: createPublicKey(
        publicKey.export({ type: 'spki', format: 'pem' }),
      ),
    };
  }
  return parClavesDemo;
}

export function obtenerJwkPublicaDemo(): Jwk {
  const { publicKey } = asegurarClavesDemo();
  const exportada = publicKey.export({ format: 'jwk' }) as {
    n: string;
    e: string;
  };
  return {
    kty: 'RSA',
    kid: CORE_DEMO_KID,
    use: 'sig',
    alg: 'RS256',
    n: exportada.n,
    e: exportada.e,
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Firma un JWT RS256 válido contra el JWKS de desarrollo/test.
 */
export function firmarJwtCore(
  claims: Partial<CoreJwtClaims> & { sub: string },
  ttlSegundos = 900,
): string {
  const { privateKey } = asegurarClavesDemo();
  const ahoraSeg = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: CORE_DEMO_KID,
  };
  const payload = {
    iss: 'uadenet-core',
    aud: 'uadenet',
    iat: ahoraSeg,
    exp: claims.exp ?? ahoraSeg + ttlSegundos,
    roles: claims.roles ?? [],
    permissions: claims.permissions ?? [],
    careerIds: claims.careerIds ?? [],
    ...claims,
  };

  const segmentoHeader = base64UrlEncode(JSON.stringify(header));
  const segmentoPayload = base64UrlEncode(JSON.stringify(payload));
  const datosAFirmar = Buffer.from(`${segmentoHeader}.${segmentoPayload}`);
  const firma = sign('RSA-SHA256', datosAFirmar, privateKey);

  return `${segmentoHeader}.${segmentoPayload}.${base64UrlEncode(firma)}`;
}
