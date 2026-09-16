import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  db,
  eq,
  eventos,
  gt,
  gte,
  inArray,
  inscripciones,
  locaciones,
  lt,
  lte,
} from '@repo/db';
import type {
  CategoriaPrecio,
  CrearEvento,
  Cupo,
  Evento,
  EventoDeCartelera,
  FiltroEventos,
} from '@repo/contracts';
import { TarifasService } from '../../common/backoffice/tarifas.service';
import { USUARIO_DEMO_ID } from '../../common/usuario-demo';

interface FilaConLocacion {
  evento: Evento;
  locacion: { nombre: string; sede: string };
}

const columnas = {
  evento: eventos,
  locacion: { nombre: locaciones.nombre, sede: locaciones.sede },
};

@Injectable()
export class EventosService {
  constructor(private readonly tarifasService: TarifasService) {}

  async crear(datos: CrearEvento): Promise<Evento> {
    const locacion = await db
      .select({ id: locaciones.id, aptoEventos: locaciones.aptoEventos })
      .from(locaciones)
      .where(eq(locaciones.id, datos.locacionId))
      .limit(1);

    if (locacion.length === 0) {
      throw new NotFoundException('La locación no existe.');
    }
    if (!locacion[0]!.aptoEventos) {
      throw new ConflictException(
        'La locación no está habilitada para eventos.',
      );
    }

    const conflicto = await db
      .select({ id: eventos.id })
      .from(eventos)
      .where(
        and(
          eq(eventos.locacionId, datos.locacionId),
          lt(eventos.fechaInicio, datos.fechaFin),
          gt(eventos.fechaFin, datos.fechaInicio),
        ),
      )
      .limit(1);

    if (conflicto.length > 0) {
      throw new ConflictException(
        'La locación ya tiene un evento en ese rango horario.',
      );
    }

    const creados = await db
      .insert(eventos)
      .values({ ...datos, creadoPor: USUARIO_DEMO_ID })
      .returning();

    return creados[0]!;
  }

  async listar(filtro: FiltroEventos): Promise<EventoDeCartelera[]> {
    const filas = await db
      .select(columnas)
      .from(eventos)
      .innerJoin(locaciones, eq(eventos.locacionId, locaciones.id))
      .where(
        and(
          filtro.desde ? gte(eventos.fechaFin, filtro.desde) : undefined,
          filtro.hasta ? lte(eventos.fechaInicio, filtro.hasta) : undefined,
        ),
      )
      .orderBy(eventos.fechaInicio);

    return this.enriquecer(filas);
  }

  async obtener(id: string): Promise<EventoDeCartelera> {
    const filas = await db
      .select(columnas)
      .from(eventos)
      .innerJoin(locaciones, eq(eventos.locacionId, locaciones.id))
      .where(eq(eventos.id, id))
      .limit(1);

    if (filas.length === 0) {
      throw new NotFoundException('El evento no existe.');
    }

    const enriquecidos = await this.enriquecer(filas);
    return enriquecidos[0]!;
  }

  async cupo(id: string): Promise<Cupo> {
    const evento = await this.obtener(id);

    return {
      eventoId: evento.id,
      cupoMaximo: evento.cupoMaximo,
      inscriptos: evento.inscriptos,
      disponibles: evento.disponibles,
    };
  }

  /**
   * Resuelve cupo e inscripción propia con dos consultas fijas, sin importar
   * cuántos eventos haya — los portales piden un mes entero de una sola vez.
   */
  private async enriquecer(
    filas: FilaConLocacion[],
  ): Promise<EventoDeCartelera[]> {
    if (filas.length === 0) {
      return [];
    }

    const ids = filas.map((fila) => fila.evento.id);

    const conteos = await db
      .select({ eventoId: inscripciones.eventoId, total: count() })
      .from(inscripciones)
      .where(inArray(inscripciones.eventoId, ids))
      .groupBy(inscripciones.eventoId);

    const propias = await db
      .select({ eventoId: inscripciones.eventoId })
      .from(inscripciones)
      .where(
        and(
          eq(inscripciones.usuarioId, USUARIO_DEMO_ID),
          inArray(inscripciones.eventoId, ids),
        ),
      );

    const totalPorEvento = new Map(
      conteos.map((fila) => [fila.eventoId, fila.total]),
    );
    const inscriptoEn = new Set(propias.map((fila) => fila.eventoId));

    return Promise.all(
      filas.map(async ({ evento, locacion }) => {
        const inscriptos = totalPorEvento.get(evento.id) ?? 0;

        return {
          ...evento,
          locacion,
          inscriptos,
          disponibles: evento.cupoMaximo - inscriptos,
          yaInscripto: inscriptoEn.has(evento.id),
          precio: await this.precioDe(evento.categoriaPrecio),
        };
      }),
    );
  }

  /** `null` si el evento es gratuito; si no, la tarifa vigente de Backoffice para esa categoría. */
  private precioDe(categoria: CategoriaPrecio | null): Promise<number | null> {
    return categoria ? this.tarifasService.consultar(categoria) : Promise.resolve(null);
  }
}
