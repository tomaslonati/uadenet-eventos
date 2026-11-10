import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  and,
  db,
  eq,
  eventos,
  gte,
  inscripciones,
  locaciones,
  lt,
} from '@repo/db';
import { NotificacionesService } from '../common/core/notificaciones.service';

export const DIAS_ANTICIPACION_RECORDATORIO = 7;
export const INTERVALO_RECORDATORIOS_MS = 24 * 60 * 60_000;

/** Cuántos recordatorios se envían en paralelo: acota la carga sobre CORE y la duración de la función. */
const LOTE = 5;

/**
 * Worker de recordatorios de eventos (HU7). Con la API como proceso largo corre
 * con `setInterval`; en Vercel lo dispara el cron diario (`CronController`).
 * Busca las inscripciones activas a eventos cuya `fechaInicio` sea dentro de 7 días
 * y despacha `evento.recordatorio` hacia CORE (`NotificacionesService`).
 */
@Injectable()
export class RecordatoriosService implements OnModuleDestroy {
  private readonly logger = new Logger(RecordatoriosService.name);
  private temporizador?: ReturnType<typeof setInterval>;

  constructor(private readonly notificaciones: NotificacionesService) {}

  iniciarWorker(intervaloMs = INTERVALO_RECORDATORIOS_MS): void {
    void this.ejecutar();
    this.temporizador = setInterval(() => void this.ejecutar(), intervaloMs);
    if (typeof this.temporizador === 'object') {
      this.temporizador.unref?.();
    }
  }

  onModuleDestroy(): void {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
  }

  async ejecutar(ahora = new Date()): Promise<number> {
    const desde = new Date(ahora);
    desde.setUTCDate(desde.getUTCDate() + DIAS_ANTICIPACION_RECORDATORIO);
    desde.setUTCHours(0, 0, 0, 0);

    const hasta = new Date(desde);
    hasta.setUTCDate(hasta.getUTCDate() + 1);

    try {
      const filas = await db
        .select({
          usuarioId: inscripciones.usuarioId,
          eventoId: eventos.id,
          titulo: eventos.titulo,
          fechaInicio: eventos.fechaInicio,
          locacionNombre: locaciones.nombre,
          locacionSede: locaciones.sede,
        })
        .from(inscripciones)
        .innerJoin(eventos, eq(inscripciones.eventoId, eventos.id))
        .innerJoin(locaciones, eq(eventos.locacionId, locaciones.id))
        .where(
          and(
            eq(inscripciones.estado, 'inscripto'),
            eq(eventos.estado, 'publicado'),
            gte(eventos.fechaInicio, desde),
            lt(eventos.fechaInicio, hasta),
          ),
        );

      let enviados = 0;
      for (let i = 0; i < filas.length; i += LOTE) {
        const resultados = await Promise.all(
          filas.slice(i, i + LOTE).map((fila) =>
            this.notificaciones.enviarRecordatorio({
              usuarioId: fila.usuarioId,
              eventoId: fila.eventoId,
              titulo: fila.titulo,
              fechaInicio: fila.fechaInicio.toISOString(),
              locacion: `${fila.locacionNombre} — ${fila.locacionSede}`,
            }),
          ),
        );
        enviados += resultados.filter(Boolean).length;
      }

      return enviados;
    } catch (error) {
      this.logger.warn(
        `No se pudieron procesar los recordatorios de eventos: ${String(error)}`,
      );
      return 0;
    }
  }
}
