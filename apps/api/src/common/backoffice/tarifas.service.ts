import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  CONCEPTO_POR_CATEGORIA,
  type CategoriaPrecio,
  type TarifaVigente,
} from '@repo/contracts';
import { BackofficeClient } from './backoffice.client';

/** Frecuencia del polling: pendiente de definir con el equipo (ver ADR 0014). */
export const INTERVALO_POLLING_MS = 60_000;

const CATEGORIAS = Object.keys(CONCEPTO_POR_CATEGORIA) as CategoriaPrecio[];

function hoy(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * Caché local de la tarifa vigente de Backoffice, refrescado por polling
 * (ADR 0014). "Al momento del cobro" lee este caché, no dispara una llamada
 * nueva por request. Una categoría sin tarifa vigente (404) sale del caché.
 */
@Injectable()
export class TarifasService implements OnModuleDestroy {
  private readonly logger = new Logger(TarifasService.name);
  private readonly cache = new Map<CategoriaPrecio, TarifaVigente>();
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly backoffice: BackofficeClient) {}

  /** Se llama una vez levantado el servidor: el primer refresh puede apuntar a esta misma API. */
  iniciarPolling(intervaloMs = INTERVALO_POLLING_MS): void {
    void this.refrescar();
    this.temporizador = setInterval(() => void this.refrescar(), intervaloMs);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.temporizador);
  }

  async refrescar(): Promise<void> {
    const fecha = hoy();

    await Promise.all(
      CATEGORIAS.map(async (categoria) => {
        try {
          const tarifa = await this.backoffice.tarifaVigente(
            CONCEPTO_POR_CATEGORIA[categoria],
            fecha,
          );
          if (tarifa) {
            this.cache.set(categoria, tarifa);
          } else {
            this.cache.delete(categoria);
          }
        } catch (error) {
          // Ante una falla de red se conserva la última tarifa conocida.
          this.logger.warn(
            `No se pudo refrescar la tarifa de ${categoria}: ${String(error)}`,
          );
        }
      }),
    );
  }

  /**
   * Monto entero en pesos de la tarifa vigente, o `null` si no hay ninguna.
   * Se redondea porque el descuento de CORE y `montoCobrado` son enteros.
   */
  precioDe(categoria: CategoriaPrecio | null): number | null {
    const tarifa = categoria ? this.cache.get(categoria) : undefined;
    return tarifa ? Math.round(tarifa.monto) : null;
  }

  /** Como `precioDe`, pero rechaza si no hay tarifa vigente: ni se crea el evento ni se confirma la inscripción. */
  exigirPrecio(categoria: CategoriaPrecio): number {
    const precio = this.precioDe(categoria);
    if (precio === null) {
      throw new ConflictException(
        `No hay una tarifa vigente en Backoffice para la categoría "${categoria}".`,
      );
    }
    return precio;
  }
}
