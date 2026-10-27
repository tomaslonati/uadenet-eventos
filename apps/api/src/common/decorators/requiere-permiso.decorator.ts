import { SetMetadata } from '@nestjs/common';

export const PERMISO_REQUERIDO_KEY = 'core:permiso_requerido';

/**
 * Exige que el JWT de CORE validado por `CoreJwtGuard` incluya el permiso
 * indicado (por ejemplo, `campus-events:manage`).
 */
export const RequierePermiso = (permiso: string) =>
  SetMetadata(PERMISO_REQUERIDO_KEY, permiso);
