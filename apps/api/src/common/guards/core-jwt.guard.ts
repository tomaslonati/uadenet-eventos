import { CanActivate, Injectable } from '@nestjs/common';

// Placeholder: valida el JWT emitido por CORE en cada request.
// Mecanismo (secreto compartido vs JWKS) todavía no definido — ver docs/04-integraciones.md.
// No implementar lógica real hasta que ese contrato esté cerrado.
@Injectable()
export class CoreJwtGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
