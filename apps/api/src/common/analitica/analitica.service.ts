import { randomUUID } from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  coreEventEnvelopeSchema,
  eventoAnaliticaSchema,
  type AsistenciaConfirmada,
  type EventoAnalitica,
  type EventoCreado,
  type InscripcionRegistrada,
} from '@repo/contracts';
import { env } from '@repo/env';
import { obtenerCoreBaseUrl } from '../core/core-crypto';
import { CoreTokenService } from '../core/core-token.service';

type SinMetadatos<T extends EventoAnalitica> = Omit<T, 'tipo' | 'emitidoEn'>;

const MAXIMO_RETENIDOS = 100;

/**
 * Publica hacia Analítica Institucional (vía bus de eventos de CORE) los eventos
 * de frecuencia (`evento.creado`), concurrencia (`inscripcion.registrada`) y
 * presentismo (`asistencia.confirmada`).
 *
 * Envía `POST /internal/v1/events` a CORE con el sobre estándar v1 (`specVersion: '1.0'`).
 */
@Injectable()
export class AnaliticaService {
  private readonly logger = new Logger(AnaliticaService.name);
  readonly publicados: EventoAnalitica[] = [];

  constructor(@Optional() private readonly tokenService?: CoreTokenService) {}

  eventoCreado(datos: SinMetadatos<EventoCreado>): void {
    this.publicar({ tipo: 'evento.creado', ...datos, emitidoEn: ahora() });
  }

  inscripcionRegistrada(datos: SinMetadatos<InscripcionRegistrada>): void {
    this.publicar({
      tipo: 'inscripcion.registrada',
      ...datos,
      emitidoEn: ahora(),
    });
  }

  asistenciaConfirmada(datos: SinMetadatos<AsistenciaConfirmada>): void {
    this.publicar({
      tipo: 'asistencia.confirmada',
      ...datos,
      emitidoEn: ahora(),
    });
  }

  private publicar(evento: EventoAnalitica): void {
    try {
      const valido = eventoAnaliticaSchema.parse(evento);
      this.publicados.push(valido);
      if (this.publicados.length > MAXIMO_RETENIDOS) {
        this.publicados.shift();
      }

      void this.enviarACore(valido);
    } catch (error) {
      this.logger.error(
        `No se pudo publicar ${evento.tipo} hacia Analítica: ${String(error)}`,
      );
    }
  }

  private async enviarACore(evento: EventoAnalitica): Promise<void> {
    try {
      const token = await this.tokenService?.obtenerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const envelope = coreEventEnvelopeSchema.parse({
        specVersion: '1.0',
        eventId: randomUUID(),
        eventType: `${evento.tipo}.v1`,
        source: 'events',
        occurredAt: evento.emitidoEn,
        subject: evento.eventoId,
        correlationId: randomUUID(),
        causationId: null,
        actor: {
          type: 'SERVICE',
          id: env.CORE_CLIENT_ID,
        },
        data: evento,
      });

      const res = await fetch(`${obtenerCoreBaseUrl()}/internal/v1/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok && !env.CORE_BASE_URL) {
        return;
      }
      if (!res.ok) {
        this.logger.warn(
          `CORE respondió ${res.status} al publicar evento ${evento.tipo}`,
        );
      }
    } catch {
      // Si el servidor local no está escuchando en un test unitario aislado, se conserva en memoria.
    }
  }
}

function ahora(): string {
  return new Date().toISOString();
}
