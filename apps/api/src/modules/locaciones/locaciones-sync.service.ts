import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, locaciones, notInArray, sql } from '@repo/db';
import { BackofficeClient } from '../../common/backoffice/backoffice.client';

/** El catálogo de espacios cambia poco: alcanza con una sincronización espaciada. */
export const INTERVALO_SYNC_MS = 10 * 60_000;

/**
 * Mantiene la copia local de `locaciones` a partir del catálogo de Backoffice
 * (ADR 0013): lista las sedes y, por cada una, sus espacios aptos para eventos.
 */
@Injectable()
export class LocacionesSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(LocacionesSyncService.name);
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly backoffice: BackofficeClient) {}

  /** Se llama una vez levantado el servidor: el primer sync puede apuntar a esta misma API. */
  iniciarSincronizacion(intervaloMs = INTERVALO_SYNC_MS): void {
    void this.sincronizar();
    this.temporizador = setInterval(() => void this.sincronizar(), intervaloMs);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.temporizador);
  }

  async sincronizar(): Promise<void> {
    try {
      const sedes = await this.backoffice.listarSedes();
      const nombreDeSede = new Map(sedes.map((sede) => [sede.id, sede.nombre]));

      const espacios = (
        await Promise.all(
          sedes.map((sede) =>
            this.backoffice.listarEspacios(sede.id, { aptoEventos: true }),
          ),
        )
      ).flat();

      const filas = espacios
        .filter(
          (espacio) =>
            espacio.aptoEventos &&
            espacio.estado === 'ACTIVO' &&
            nombreDeSede.has(espacio.sedeId),
        )
        .map((espacio) => ({
          id: espacio.id,
          nombre: espacio.nombre,
          sede: nombreDeSede.get(espacio.sedeId)!,
          capacidad: espacio.capacidad,
          aptoEventos: true,
        }));

      // Se arma todo antes de escribir: si algo falló arriba, no se toca la copia local.
      if (filas.length === 0) {
        this.logger.warn(
          'Backoffice no devolvió espacios aptos para eventos; se conserva el catálogo local.',
        );
        return;
      }

      await db
        .insert(locaciones)
        .values(filas)
        .onConflictDoUpdate({
          target: locaciones.id,
          set: {
            nombre: sql`excluded.nombre`,
            sede: sql`excluded.sede`,
            capacidad: sql`excluded.capacidad`,
            aptoEventos: sql`excluded.apto_eventos`,
          },
        });

      // Lo que Backoffice ya no marca apto no se borra (hay eventos que lo referencian): se deshabilita.
      await db
        .update(locaciones)
        .set({ aptoEventos: false })
        .where(
          notInArray(
            locaciones.id,
            filas.map((fila) => fila.id),
          ),
        );
    } catch (error) {
      this.logger.warn(
        `No se pudo sincronizar el catálogo de locaciones: ${String(error)}`,
      );
    }
  }
}
