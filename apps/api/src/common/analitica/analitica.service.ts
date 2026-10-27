import { randomUUID } from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  eventoAnaliticaSchema,
  type AsistenciaConfirmada,
  type EventoAnalitica,
  type EventoCreado,
  type InscripcionRegistrada,
} from '@repo/contracts';
import { env } from '@repo/env';
import { CoreTokenService } from '../core/core-token.service';

type SinMetadatos<T extends EventoAnalitica> = Omit<T, 'tipo' | 'emitidoEn'>;

const MAXIMO_RETENIDOS = 100;

/**
 * Publica hacia Analítica Institucional (vía bus de eventos de CORE) los eventos
 * de frecuencia (`evento.creado`), concurrencia (`inscripcion.registrada`) y
 * presentismo (`asistencia.confirmada`).
 *
 * Cuando CORE_BASE_URL está configurado, envía POST /internal/v1/events con el
 * envelope estándar de CORE (specVersion 1.0). En modo local valida contra Zod,
 * loguea y retiene en memoria los últimos eventos publicados.
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

      if (!env.CORE_BASE_URL) {
        this.logger.log(`[mock] ${valido.tipo} ${JSON.stringify(valido)}`);
        return;
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
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const envelope = {
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
          id: env.CORE_CLIENT_ID ?? 'events-service',
        },
        data: evento,
      };

      const res = await fetch(`${env.CORE_BASE_URL}/internal/v1/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        this.logger.warn(
          `CORE respondió ${res.status} al publicar evento ${evento.tipo}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo entregar ${evento.tipo} al bus de CORE: ${String(err)}`,
      );
    }
  }
}

function ahora(): string {
  return new Date().toISOString();
}
