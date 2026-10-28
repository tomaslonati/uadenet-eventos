import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CoreAuthUser, CoreLoginResponse } from '@repo/contracts';
import type { Response as ExpressResponse } from 'express';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';
import {
  USUARIO_DEMO,
  type UsuarioAutenticado,
} from '../../common/usuario-demo';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Iniciar sesión con email y contraseña institucional (integrado con CORE /api/v1/auth/login)',
  })
  @ApiOkResponse({
    description: 'Devuelve accessToken RS256, expiresIn y el perfil de CORE',
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res?: ExpressResponse,
  ): Promise<CoreLoginResponse> {
    const { respuesta, setCookie } = await this.authService.login(body);
    if (setCookie && res) {
      res.setHeader('Set-Cookie', setCookie);
    }
    return respuesta;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Rotar refresh token y emitir un nuevo accessToken desde CORE (/api/v1/auth/refresh)',
  })
  @ApiOkResponse({ description: 'Nuevo accessToken emitido' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token ausente, expirado o revocado',
  })
  async refresh(
    @Headers('cookie') cookieHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: ExpressResponse,
  ): Promise<CoreLoginResponse> {
    const { respuesta, setCookie } = await this.authService.refresh(
      cookieHeader,
      authHeader,
    );
    if (setCookie && res) {
      res.setHeader('Set-Cookie', setCookie);
    }
    return respuesta;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Revocar la sesión activa en CORE y limpiar el refresh token (/api/v1/auth/logout)',
  })
  @ApiNoContentResponse({ description: 'Sesión cerrada' })
  async logout(
    @Headers('cookie') cookieHeader?: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<void> {
    await this.authService.logout(cookieHeader, authHeader);
  }

  @Get('me')
  @UseGuards(CoreJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener el perfil de autenticación e IAM del usuario actual (/api/v1/auth/me)',
  })
  @ApiOkResponse({ description: 'Perfil actual del usuario autenticado' })
  @ApiUnauthorizedResponse({ description: 'Bearer token ausente o inválido' })
  me(
    @UsuarioActual() usuario: UsuarioAutenticado = USUARIO_DEMO,
  ): Promise<CoreAuthUser> {
    return this.authService.me(usuario);
  }
}
