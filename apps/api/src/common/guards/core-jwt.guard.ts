import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CoreJwtClaims, RolUsuarioDominio } from '@repo/contracts';
import { db, sql, usuarios } from '@repo/db';
import { env } from '@repo/env';
import { CoreJwksService } from '../core/core-jwks.service';
import { PERMISO_REQUERIDO_KEY } from '../decorators/requiere-permiso.decorator';
import { USUARIO_DEMO, type UsuarioAutenticado } from '../usuario-demo';

interface RequestConUsuario {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  usuario?: UsuarioAutenticado;
}

function leerHeader(
  headers: Record<string, string | string[] | undefined>,
  nombre: string,
): string | undefined {
  const valor = headers[nombre.toLowerCase()];
  if (Array.isArray(valor)) {
    return valor[0];
  }
  return valor;
}

function separarLista(valor?: string): string[] {
  if (!valor) {
    return [];
  }
  return valor
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mapearRolDominio(
  roles: string[],
  permissions: string[],
  rolDirecto?: RolUsuarioDominio,
): RolUsuarioDominio {
  if (rolDirecto) {
    return rolDirecto;
  }
  if (
    roles.includes('OPERATIONS_ADMIN') ||
    roles.includes('ADMIN') ||
    permissions.includes('campus-events:manage')
  ) {
    return 'administrativo';
  }
  if (roles.includes('TEACHER')) {
    return 'docente';
  }
  return 'estudiante';
}

/**
 * Valida la identidad y permisos de CORE en cada request:
 * 1. Verifica firma RS256 y vencimiento del JWT (`Authorization: Bearer <token>`)
 *    contra las claves públicas de `GET /.well-known/jwks.json`.
 * 2. Verifica `X-Core-Signature` (HMAC-SHA256) cuando `CORE_GATEWAY_SECRET` está definido.
 * 3. Reconstruye `request.usuario` con `sub`, `roles`, `permissions`, `careerIds` y `rol`.
 * 4. Sincroniza el usuario en la tabla local `usuarios` (upsert por `id`).
 * 5. Autoriza operaciones protegidas con `@RequierePermiso(...)` (ej. `campus-events:manage`).
 */
@Injectable()
export class CoreJwtGuard implements CanActivate {
  private readonly jwksService: CoreJwksService;
  private readonly reflector: Reflector;

  constructor(
    @Optional() jwksService?: CoreJwksService,
    @Optional() reflector?: Reflector,
  ) {
    this.jwksService = jwksService ?? new CoreJwksService();
    this.reflector = reflector ?? new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const headers = request.headers ?? {};

    const authHeader = leerHeader(headers, 'authorization');
    const headerUserId = leerHeader(headers, 'x-user-id');
    const correlationId =
      leerHeader(headers, 'x-correlation-id') ?? randomUUID();

    let usuario: UsuarioAutenticado;

    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'El header Authorization debe usar el esquema Bearer.',
        );
      }
      const token = authHeader.slice('Bearer '.length).trim();
      const claims = await this.jwksService.verificarToken(token);
      usuario = this.construirDesdeClaimsYHeaders(
        claims,
        headers,
        correlationId,
        token,
      );
      this.verificarFirmaGateway(request, usuario.id, correlationId);
      await this.upsertUsuarioLocal(usuario);
    } else if (headerUserId) {
      this.verificarFirmaGateway(request, headerUserId, correlationId);
      const roles = separarLista(leerHeader(headers, 'x-user-roles'));
      const permissions = separarLista(
        leerHeader(headers, 'x-user-permissions'),
      );
      const careerIds = separarLista(leerHeader(headers, 'x-user-career-ids'));
      const rol = mapearRolDominio(roles, permissions);
      const email =
        leerHeader(headers, 'x-user-email') ?? `${headerUserId}@uade.edu.ar`;
      const nombre = leerHeader(headers, 'x-user-name') ?? headerUserId;

      usuario = {
        id: headerUserId,
        nombre,
        email,
        rol,
        roles: roles.length > 0 ? roles : [rol.toUpperCase()],
        permissions:
          permissions.length > 0
            ? permissions
            : rol === 'administrativo'
              ? [
                  'campus-events:manage',
                  'wallet:read:self',
                  'wallet:credit:self',
                ]
              : ['wallet:read:self', 'wallet:credit:self'],
        careerIds,
        correlationId,
      };
      await this.upsertUsuarioLocal(usuario);
    } else if (env.CORE_BASE_URL) {
      throw new UnauthorizedException(
        'Se requiere autenticación Bearer de CORE.',
      );
    } else {
      usuario = { ...USUARIO_DEMO, correlationId };
    }

    request.usuario = usuario;

    const permisoRequerido = this.reflector.getAllAndOverride<
      string | undefined
    >(PERMISO_REQUERIDO_KEY, [context.getHandler(), context.getClass()]);

    if (
      permisoRequerido &&
      !usuario.permissions.includes(permisoRequerido) &&
      !(
        permisoRequerido === 'campus-events:manage' &&
        usuario.rol === 'administrativo'
      )
    ) {
      throw new ForbiddenException(
        `No tenés el permiso requerido (${permisoRequerido}) para esta operación.`,
      );
    }

    return true;
  }

  private construirDesdeClaimsYHeaders(
    claims: CoreJwtClaims,
    headers: Record<string, string | string[] | undefined>,
    correlationId: string,
    token: string,
  ): UsuarioAutenticado {
    const rolesHeader = separarLista(leerHeader(headers, 'x-user-roles'));
    const permsHeader = separarLista(leerHeader(headers, 'x-user-permissions'));
    const careersHeader = separarLista(
      leerHeader(headers, 'x-user-career-ids'),
    );

    const roles = claims.roles.length > 0 ? claims.roles : rolesHeader;
    const permissions =
      claims.permissions.length > 0 ? claims.permissions : permsHeader;
    const careerIds =
      claims.careerIds.length > 0 ? claims.careerIds : careersHeader;
    const rol = mapearRolDominio(roles, permissions, claims.rol);
    const email =
      claims.email ??
      leerHeader(headers, 'x-user-email') ??
      `${claims.sub}@uade.edu.ar`;
    const nombre =
      claims.nombre ??
      leerHeader(headers, 'x-user-name') ??
      email.split('@')[0] ??
      claims.sub;

    return {
      id: claims.sub,
      nombre,
      email,
      rol,
      roles,
      permissions,
      careerIds,
      correlationId,
      token,
    };
  }

  private verificarFirmaGateway(
    request: RequestConUsuario,
    sub: string,
    correlationId: string,
  ): void {
    const secreto = env.CORE_GATEWAY_SECRET;
    if (!secreto) {
      return;
    }

    const firmaRecibida = leerHeader(request.headers, 'x-core-signature');
    const timestamp = leerHeader(request.headers, 'x-core-timestamp');
    if (!firmaRecibida || !timestamp) {
      throw new UnauthorizedException(
        'Faltan headers de firma del Gateway de CORE (X-Core-Signature / X-Core-Timestamp).',
      );
    }

    const metodo = (request.method ?? 'GET').toUpperCase();
    const path = (request.originalUrl ?? request.url ?? '/').split('?')[0];
    const mensaje = `${metodo}\n${path}\n${sub}\n${correlationId}\n${timestamp}`;
    const esperada = createHmac('sha256', secreto)
      .update(mensaje)
      .digest('hex');

    const recibidaLimpia = firmaRecibida.replace(/^sha256=/, '');
    const bufEsperada = Buffer.from(esperada, 'utf8');
    const bufRecibida = Buffer.from(recibidaLimpia, 'utf8');

    if (
      bufEsperada.length !== bufRecibida.length ||
      !timingSafeEqual(bufEsperada, bufRecibida)
    ) {
      throw new UnauthorizedException(
        'Firma X-Core-Signature del Gateway de CORE inválida.',
      );
    }
  }

  private async upsertUsuarioLocal(usuario: UsuarioAutenticado): Promise<void> {
    try {
      await db
        .insert(usuarios)
        .values({
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        })
        .onConflictDoUpdate({
          target: usuarios.id,
          set: {
            nombre: sql`excluded.nombre`,
            email: sql`excluded.email`,
            rol: sql`excluded.rol`,
            actualizadoEn: new Date(),
          },
        });
    } catch {
      // En tests unitarios o e2e sin conexión activa a Postgres, no bloquear el guard.
    }
  }
}
