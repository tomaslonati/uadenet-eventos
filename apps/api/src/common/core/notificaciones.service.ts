import { randomUUID } from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  avisoEventoSchema,
  coreEventEnvelopeSchema,
  coreNotificationRequestSchema,
  coreNotificationsPageSchema,
  recordatorioEventoSchema,
  type AvisoEvento,
  type CoreNotificationsPage,
  type RecordatorioEvento,
} from '@repo/contracts';
import { env } from '@repo/env';
import { fetchCore, obtenerCoreBaseUrl } from './core-crypto';
import { CoreTokenService } from './core-token.service';

export type DatosRecordatorio = Omit<RecordatorioEvento, 'tipo' | 'url'> & {
  url?: string;
};

const MAXIMO_RETENIDOS = 100;

const TIPO_NOTIFICACION_AVISO: Record<AvisoEvento['tipo'], string> = {
  'evento.reprogramado': 'EVENT_RESCHEDULED',
  'evento.cancelado': 'EVENT_CANCELLED',
};

const TITULO_AVISO: Record<AvisoEvento['tipo'], string> = {
  'evento.reprogramado': 'Cambió la fecha o el lugar de un evento',
  'evento.cancelado': 'Se canceló un evento',
};

/**
 * Envía notificaciones de eventos hacia CORE: recordatorios (HU7), y avisos de
 * reprogramación o cancelación (`enviarAviso`). El recordatorio va así:
 * - Notificación para campanita/correo del portal (`POST /internal/v1/notifications`)
 * - Evento en el bus (`POST /internal/v1/events`, `eventType: 'evento.recordatorio.v1'`)
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  readonly enviados: RecordatorioEvento[] = [];
  readonly avisos: AvisoEvento[] = [];

  constructor(@Optional() private readonly tokenService?: CoreTokenService) {}

  async enviarRecordatorio(datos: DatosRecordatorio): Promise<boolean> {
    const url =
      datos.url ??
      `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/eventos/${datos.eventoId}`;

    const recordatorio = recordatorioEventoSchema.parse({
      tipo: 'evento.recordatorio',
      ...datos,
      url,
    });

    this.enviados.push(recordatorio);
    if (this.enviados.length > MAXIMO_RETENIDOS) {
      this.enviados.shift();
    }

    const baseUrl = obtenerCoreBaseUrl();
    const token = await this.tokenService?.obtenerToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payloadNotificacion = coreNotificationRequestSchema.parse({
      userId: recordatorio.usuarioId,
      type: 'EVENT_REMINDER',
      title: `Recordatorio: ${recordatorio.titulo}`,
      message: `Falta 1 semana para "${recordatorio.titulo}" en ${recordatorio.locacion}.`,
      actionUrl: recordatorio.url,
      sourceModule: 'events',
      sourceReference: `evento/${recordatorio.eventoId}`,
    });

    const envelope = coreEventEnvelopeSchema.parse({
      specVersion: '1.0',
      eventId: randomUUID(),
      eventType: 'evento.recordatorio.v1',
      source: 'events',
      occurredAt: new Date().toISOString(),
      subject: recordatorio.eventoId,
      correlationId: randomUUID(),
      causationId: null,
      actor: {
        type: 'service',
        id: env.CORE_CLIENT_ID,
      },
      data: recordatorio,
    });

    try {
      const [resNotif, resEvent] = await Promise.all([
        fetchCore(`${baseUrl}/internal/v1/notifications`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadNotificacion),
          signal: AbortSignal.timeout(5_000),
        }),
        fetchCore(`${baseUrl}/internal/v1/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify(envelope),
          signal: AbortSignal.timeout(5_000),
        }),
      ]);

      return (resNotif.ok || resNotif.status === 409) && resEvent.ok;
    } catch (err) {
      this.logger.warn(
        `No se pudo entregar recordatorio a CORE para ${recordatorio.usuarioId}: ${String(err)}`,
      );
      return false;
    }
  }

  /**
   * Avisa a un inscripto que el evento se reprogramó o se canceló. Nunca lanza:
   * un aviso que no sale no puede deshacer el cambio ya hecho sobre el evento.
   */
  async enviarAviso(datos: AvisoEvento): Promise<boolean> {
    const aviso = avisoEventoSchema.parse(datos);

    this.avisos.push(aviso);
    if (this.avisos.length > MAXIMO_RETENIDOS) {
      this.avisos.shift();
    }

    try {
      const payload = coreNotificationRequestSchema.parse({
        userId: aviso.usuarioId,
        type: TIPO_NOTIFICACION_AVISO[aviso.tipo],
        title: TITULO_AVISO[aviso.tipo],
        message: aviso.mensaje,
        actionUrl: `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/eventos/${aviso.eventoId}`,
        sourceModule: 'events',
        sourceReference: aviso.referencia,
      });

      const token = await this.tokenService?.obtenerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetchCore(
        `${obtenerCoreBaseUrl()}/internal/v1/notifications`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5_000),
        },
      );

      return res.ok || res.status === 409;
    } catch (err) {
      this.logger.warn(
        `No se pudo entregar el aviso ${aviso.tipo} a ${aviso.usuarioId}: ${String(err)}`,
      );
      return false;
    }
  }

  async listarDelUsuario(
    tokenUsuario?: string,
  ): Promise<CoreNotificationsPage> {
    if (!tokenUsuario) {
      return { items: [], nextCursor: null };
    }
    try {
      const res = await fetchCore(
        `${obtenerCoreBaseUrl()}/api/v1/notifications`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${tokenUsuario}`,
          },
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!res.ok) {
        return { items: [], nextCursor: null };
      }
      return coreNotificationsPageSchema.parse(await res.json());
    } catch {
      return { items: [], nextCursor: null };
    }
  }
}
