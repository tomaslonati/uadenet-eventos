import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firmarJwtCore } from '../core/core-crypto';
import { CoreJwksService } from '../core/core-jwks.service';
import type { UsuarioAutenticado } from '../usuario-demo';
import { CoreJwtGuard } from './core-jwt.guard';

function crearContexto(
  headers: Record<string, string>,
  permisoRequerido?: string,
): {
  ctx: ExecutionContext;
  req: { headers: Record<string, string>; usuario?: UsuarioAutenticado };
  reflector: Reflector;
} {
  const req: { headers: Record<string, string>; usuario?: UsuarioAutenticado } =
    {
      headers: Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
      ),
    };
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(permisoRequerido),
  } as unknown as Reflector;
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { ctx, req, reflector };
}

describe('CoreJwtGuard', () => {
  let jwksService: CoreJwksService;

  beforeEach(() => {
    jwksService = new CoreJwksService();
  });

  it('valida un JWT RS256 emitido por CORE y extrae sub, roles, permissions y careerIds', async () => {
    const token = firmarJwtCore({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 't.vidal@uade.edu.ar',
      nombre: 'Tomás Vidal',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      careerIds: ['ing-sistemas'],
    });

    const { ctx, req, reflector } = crearContexto({
      Authorization: `Bearer ${token}`,
    });
    const guard = new CoreJwtGuard(jwksService, reflector);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.usuario).toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 't.vidal@uade.edu.ar',
      nombre: 'Tomás Vidal',
      rol: 'estudiante',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      careerIds: ['ing-sistemas'],
    });
  });

  it('mapea OPERATIONS_ADMIN + campus-events:manage al rol administrativo y autoriza el permiso', async () => {
    const token = firmarJwtCore({
      sub: 'u-admin-1',
      email: 'm.ibarra@uade.edu.ar',
      roles: ['OPERATIONS_ADMIN'],
      permissions: ['campus-events:manage', 'wallet:read:self'],
    });

    const { ctx, req, reflector } = crearContexto(
      { Authorization: `Bearer ${token}` },
      'campus-events:manage',
    );
    const guard = new CoreJwtGuard(jwksService, reflector);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.usuario?.rol).toBe('administrativo');
  });

  it('rechaza con 403 ForbiddenException si el usuario no posee el permiso requerido', async () => {
    const token = firmarJwtCore({
      sub: 'u-alumno-1',
      email: 'alumno@uade.edu.ar',
      roles: ['STUDENT'],
      permissions: ['wallet:read:self'],
    });

    const { ctx, reflector } = crearContexto(
      { Authorization: `Bearer ${token}` },
      'campus-events:manage',
    );
    const guard = new CoreJwtGuard(jwksService, reflector);

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza con 401 UnauthorizedException si el JWT está expirado o adulterado', async () => {
    const tokenExpirado = firmarJwtCore(
      {
        sub: 'u-alumno-1',
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      -60,
    );

    const { ctx, reflector } = crearContexto({
      Authorization: `Bearer ${tokenExpirado}`,
    });
    const guard = new CoreJwtGuard(jwksService, reflector);

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
