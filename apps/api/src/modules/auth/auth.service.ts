import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  coreAuthUserSchema,
  coreLoginRequestSchema,
  coreLoginResponseSchema,
  type CoreAuthUser,
  type CoreLoginRequest,
  type CoreLoginResponse,
} from '@repo/contracts';
import { env } from '@repo/env';
import {
  firmarJwtCore,
  obtenerCoreBaseUrl,
  USA_CORE_MOCK,
} from '../../common/core/core-crypto';
import type { UsuarioAutenticado } from '../../common/usuario-demo';

const TIMEOUT_MS = 5_000;

interface CuentaDemoAuth {
  user: CoreAuthUser;
  nombre: string;
  password: string;
}

const CUENTAS_DEMO_AUTH: CuentaDemoAuth[] = [
  {
    user: {
      id: 'seed-admin-demo',
      email: 'm.ibarra@uadenet.edu',
      careerIds: [],
      roles: ['OPERATIONS_ADMIN'],
      permissions: [
        'campus-events:manage',
        'wallet:read:self',
        'wallet:credit:self',
      ],
      status: 'ACTIVE',
    },
    nombre: 'Mariana Ibarra',
    password: 'admin.2026',
  },
  {
    user: {
      id: 'seed-docente-demo',
      email: 'e.ruiz@uadenet.edu',
      careerIds: [],
      roles: ['TEACHER'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    },
    nombre: 'Dr. Esteban Ruiz',
    password: 'docente.2026',
  },
  {
    user: {
      id: 'seed-alumno-demo',
      email: 't.vidal@uadenet.edu',
      careerIds: ['ing-informatica'],
      roles: ['STUDENT'],
      permissions: ['wallet:read:self', 'wallet:credit:self'],
      status: 'ACTIVE',
    },
    nombre: 'Tomás Vidal',
    password: 'alumno.2026',
  },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(input: unknown): Promise<{
    respuesta: CoreLoginResponse;
    setCookie?: string | null;
  }> {
    const parsed = coreLoginRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        detail:
          'El email y la contraseña (mínimo 8 caracteres) son obligatorios.',
      });
    }

    const credenciales: CoreLoginRequest = parsed.data;

    try {
      const res = await fetch(`${obtenerCoreBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(credenciales),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) {
        const respuesta = coreLoginResponseSchema.parse(await res.json());
        return {
          respuesta,
          setCookie: res.headers.get('set-cookie'),
        };
      }

      if (USA_CORE_MOCK || env.NODE_ENV !== 'production') {
        const demo = this.autenticarDemo(credenciales);
        if (demo) {
          return { respuesta: demo };
        }
      }

      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        detail: 'Credenciales institucionales inválidas.',
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (USA_CORE_MOCK || env.NODE_ENV !== 'production') {
        const demo = this.autenticarDemo(credenciales);
        if (demo) {
          return { respuesta: demo };
        }
      }
      this.logger.warn(`Error al autenticar contra CORE: ${String(error)}`);
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        detail: 'No se pudo validar las credenciales contra CORE.',
      });
    }
  }

  async refresh(
    cookieHeader?: string,
    authHeader?: string,
  ): Promise<{
    respuesta: CoreLoginResponse;
    setCookie?: string | null;
  }> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(`${obtenerCoreBaseUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_FAILED',
        detail: 'La sesión expiró o el refresh token es inválido.',
      });
    }

    return {
      respuesta: coreLoginResponseSchema.parse(await res.json()),
      setCookie: res.headers.get('set-cookie'),
    };
  }

  async logout(cookieHeader?: string, authHeader?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    try {
      await fetch(`${obtenerCoreBaseUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`No se pudo propagar logout a CORE: ${String(error)}`);
    }
  }

  async me(usuario: UsuarioAutenticado): Promise<CoreAuthUser> {
    if (usuario.token) {
      try {
        const res = await fetch(`${obtenerCoreBaseUrl()}/api/v1/auth/me`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${usuario.token}`,
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) {
          return coreAuthUserSchema.parse(await res.json());
        }
      } catch (error) {
        this.logger.debug(
          `Fallback a claims verificados para /auth/me: ${String(error)}`,
        );
      }
    }

    return {
      id: usuario.id,
      email: usuario.email,
      careerIds: usuario.careerIds,
      roles: usuario.roles,
      permissions: usuario.permissions,
      status: 'ACTIVE',
    };
  }

  private autenticarDemo(
    credenciales: CoreLoginRequest,
  ): CoreLoginResponse | null {
    const emailBuscado = credenciales.email.trim().toLowerCase();
    const cuenta = CUENTAS_DEMO_AUTH.find(
      (c) =>
        c.user.email.toLowerCase() === emailBuscado &&
        c.password === credenciales.password,
    );
    if (!cuenta) {
      return null;
    }

    const accessToken = firmarJwtCore(
      {
        sub: cuenta.user.id,
        email: cuenta.user.email,
        nombre: cuenta.nombre,
        roles: cuenta.user.roles,
        permissions: cuenta.user.permissions,
        careerIds: cuenta.user.careerIds,
      },
      900,
    );

    return {
      accessToken,
      expiresIn: 900,
      user: cuenta.user,
    };
  }
}
