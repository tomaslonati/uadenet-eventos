import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { USUARIO_DEMO, type UsuarioAutenticado } from '../usuario-demo';

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ usuario?: UsuarioAutenticado }>();
    return request.usuario ?? USUARIO_DEMO;
  },
);
