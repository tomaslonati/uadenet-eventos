import type { RolUsuarioDominio } from '@repo/contracts';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuarioDominio;
  roles: string[];
  permissions: string[];
  careerIds: string[];
  correlationId: string;
  token?: string;
}

/**
 * Usuario por defecto en entorno local sin headers de autenticación (sembrado por
 * `packages/db/src/seed.ts`). Cuando la request incluye `Authorization: Bearer <JWT>`
 * o los headers del Gateway de CORE (`X-User-Id`, `X-User-Roles`, `X-User-Permissions`),
 * `CoreJwtGuard` resuelve el usuario real del token.
 */
export const USUARIO_DEMO_ID = 'seed-admin-demo';
export const USUARIO_DEMO_ROL = 'administrativo' as const;

export const USUARIO_DEMO: UsuarioAutenticado = {
  id: USUARIO_DEMO_ID,
  nombre: 'Mariana Ibarra',
  email: 'm.ibarra@uadenet.edu',
  rol: USUARIO_DEMO_ROL,
  roles: ['OPERATIONS_ADMIN'],
  permissions: [
    'campus-events:manage',
    'wallet:read:self',
    'wallet:credit:self',
  ],
  careerIds: [],
  correlationId: 'demo-correlation-id',
};
