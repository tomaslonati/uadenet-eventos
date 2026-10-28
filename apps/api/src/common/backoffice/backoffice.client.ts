import { Injectable } from '@nestjs/common';
import {
  espacioBackofficeSchema,
  sedeBackofficeSchema,
  tarifaVigenteSchema,
  usuarioBackofficeSchema,
  type ConceptoTarifa,
  type EspacioBackoffice,
  type SedeBackoffice,
  type TarifaVigente,
  type UsuarioBackoffice,
} from '@repo/contracts';
import { env } from '@repo/env';
import { z } from 'zod';

import { CoreTokenService } from '../core/core-token.service';
import {
  obtenerEspaciosMock,
  obtenerSedesMock,
  obtenerTarifaVigenteMock,
  obtenerUsuarioMock,
} from './backoffice-mock.controller';

const TIMEOUT_MS = 5_000;

/** Sin `BACKOFFICE_BASE_URL` se usa el Backoffice simulado que sirve esta misma API. */
export const USA_BACKOFFICE_MOCK = env.BACKOFFICE_BASE_URL === undefined;

function usarMockEnMemoria(): boolean {
  return USA_BACKOFFICE_MOCK && process.env.VERCEL === '1';
}

function obtenerBaseUrl(): string {
  return (
    env.BACKOFFICE_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  );
}

/** Cliente HTTP de los endpoints de Backoffice Administrativo. Los paths son los que ellos publicaron. */
@Injectable()
export class BackofficeClient {
  constructor(private readonly coreTokenService?: CoreTokenService) {}

  listarSedes(): Promise<SedeBackoffice[]> {
    if (usarMockEnMemoria()) {
      return Promise.resolve(obtenerSedesMock());
    }
    return this.pedir(
      '/api/v1/backoffice/sedes',
      z.array(sedeBackofficeSchema),
    );
  }

  /** Se pide por sede: Backoffice no tiene listado global de espacios. */
  listarEspacios(
    sedeId: string,
    filtro: { aptoEventos: boolean },
  ): Promise<EspacioBackoffice[]> {
    if (usarMockEnMemoria()) {
      const lista = obtenerEspaciosMock(sedeId, filtro.aptoEventos);
      if (!lista) {
        return Promise.reject(
          new Error(
            `Backoffice respondió 404 en /api/v1/backoffice/sedes/${sedeId}/espacios`,
          ),
        );
      }
      return Promise.resolve(lista);
    }
    const query = new URLSearchParams({
      aptoEventos: String(filtro.aptoEventos),
    });
    return this.pedir(
      `/api/v1/backoffice/sedes/${encodeURIComponent(sedeId)}/espacios?${query.toString()}`,
      z.array(espacioBackofficeSchema),
    );
  }

  /** `null` si Backoffice responde 404: no hay ninguna versión vigente para ese concepto y fecha. */
  async tarifaVigente(
    concepto: ConceptoTarifa,
    fecha: string,
  ): Promise<TarifaVigente | null> {
    if (usarMockEnMemoria()) {
      return obtenerTarifaVigenteMock(concepto, fecha);
    }
    const query = new URLSearchParams({ concepto, fecha });
    return this.pedir(
      `/api/v1/backoffice/tarifas/vigente?${query.toString()}`,
      tarifaVigenteSchema,
      { nullEn404: true },
    );
  }

  obtenerUsuario(id: string): Promise<UsuarioBackoffice> {
    if (usarMockEnMemoria()) {
      return Promise.resolve(obtenerUsuarioMock(id));
    }
    return this.pedir(
      `/api/v1/backoffice/usuarios/${encodeURIComponent(id)}`,
      usuarioBackofficeSchema,
    );
  }

  private async pedir<T>(
    ruta: string,
    schema: z.ZodType<T>,
    opciones: { nullEn404: true },
  ): Promise<T | null>;
  private async pedir<T>(ruta: string, schema: z.ZodType<T>): Promise<T>;
  private async pedir<T>(
    ruta: string,
    schema: z.ZodType<T>,
    opciones?: { nullEn404: true },
  ): Promise<T | null> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = await this.coreTokenService?.obtenerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const respuesta = await fetch(`${obtenerBaseUrl()}${ruta}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (respuesta.status === 404 && opciones?.nullEn404) {
      return null;
    }
    if (!respuesta.ok) {
      throw new Error(`Backoffice respondió ${respuesta.status} en ${ruta}`);
    }

    return schema.parse(await respuesta.json());
  }
}
