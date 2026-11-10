import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { env } from '@repo/env';

/**
 * Protege los endpoints que invoca el cron de Vercel. Vercel envía
 * `Authorization: Bearer <CRON_SECRET>`; sin `CRON_SECRET` configurada el
 * endpoint queda cerrado para todos, no abierto.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secreto = env.CRON_SECRET;
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const cabecera = request.headers.authorization;
    const recibido = typeof cabecera === 'string' ? cabecera : '';

    if (!secreto || !coincide(recibido, `Bearer ${secreto}`)) {
      throw new UnauthorizedException('Cron no autorizado.');
    }
    return true;
  }
}

function coincide(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
