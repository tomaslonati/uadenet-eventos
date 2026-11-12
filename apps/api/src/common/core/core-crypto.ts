import { createServer, type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';
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

/** Sin `CORE_BASE_URL` (o en entorno de test) se monta el controlador simulado de CORE en esta misma API. */
export const USA_CORE_MOCK =
  env.CORE_BASE_URL === undefined || env.NODE_ENV === 'test';

export function obtenerCoreBaseUrl(): string {
  if (env.NODE_ENV === 'test' || !env.CORE_BASE_URL) {
    return `http://localhost:${process.env.PORT ?? 3000}/api/v1/core`;
  }
  return env.CORE_BASE_URL;
}

let manejadorLocal: RequestListener | null = null;
let puertoInterno: Promise<number> | null = null;

/** Registra la app HTTP para que, en Vercel, el CORE simulado se sirva desde un puerto interno del mismo proceso. */
export function registrarAppCore(manejador: unknown): void {
  manejadorLocal = manejador as RequestListener;
}

function obtenerPuertoInterno(manejador: RequestListener): Promise<number> {
  puertoInterno ??= new Promise<number>((resolver, rechazar) => {
    const servidor = createServer(manejador);
    servidor.once('error', rechazar);
    servidor.listen(0, '127.0.0.1', () => {
      servidor.unref();
      resolver((servidor.address() as AddressInfo).port);
    });
  });
  return puertoInterno;
}

/**
 * `fetch` hacia CORE. Con el CORE simulado en Vercel no hay un puerto local conocido al que apuntar,
 * así que se levanta uno interno con la misma app; con el CORE real o fuera de Vercel es `fetch` común.
 */
export async function fetchCore(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!USA_CORE_MOCK || process.env.VERCEL !== '1' || !manejadorLocal) {
    return fetch(url, init);
  }
  const destino = new URL(url);
  const puerto = await obtenerPuertoInterno(manejadorLocal);
  return fetch(
    `http://127.0.0.1:${puerto}${destino.pathname}${destino.search}`,
    init,
  );
}

let parClavesDemo: { privateKey: KeyObject; publicKey: KeyObject } | null =
  null;

function asegurarClavesDemo(): { privateKey: KeyObject; publicKey: KeyObject } {
  if (!parClavesDemo && env.CORE_MOCK_PRIVATE_KEY) {
    const privateKey = createPrivateKey(
      Buffer.from(env.CORE_MOCK_PRIVATE_KEY, 'base64').toString('utf8'),
    );
    parClavesDemo = { privateKey, publicKey: createPublicKey(privateKey) };
  }
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
